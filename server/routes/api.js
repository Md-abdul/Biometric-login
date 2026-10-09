const express = require('express');
const router = express.Router();
const { query, isDbConnected, checkDbHealth, formatDbError } = require('../db');
const { extractFace, matchFace, isServiceHealthy } = require('../services/faceService');

// Format helper for duration
function formatWorkDuration(diffMs) {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// Format 12-hour time
function formatTime12(dateObj) {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

// -------------------------------------------------------------
// 1. System & Biometric Status
// -------------------------------------------------------------
router.get('/status', async (req, res) => {
  try {
    const aiOnline = await isServiceHealthy();
    let dbOnline = isDbConnected();
    if (!dbOnline && (process.env.DATABASE_URL || process.env.DB_HOST)) {
      dbOnline = await checkDbHealth();
    }

    let stats = {
      totalEmployees: 0,
      registeredFaces: 0,
      presentToday: 0,
      currentlyIn: 0,
      punchedOutToday: 0,
    };

    if (dbOnline) {
      try {
        const statsResult = await query(`
          SELECT 
            COUNT(*) as total_employees,
            COUNT(CASE WHEN face_registered = TRUE THEN 1 END) as registered_faces
          FROM employees;
        `);

        const todayStats = await query(`
          SELECT 
            COUNT(*) as present_today,
            COUNT(CASE WHEN punch_out_time IS NULL THEN 1 END) as currently_in,
            COUNT(CASE WHEN punch_out_time IS NOT NULL THEN 1 END) as punched_out_today
          FROM attendances
          WHERE date = CURRENT_DATE;
        `);

        stats = {
          totalEmployees: Number(statsResult.rows[0].total_employees),
          registeredFaces: Number(statsResult.rows[0].registered_faces),
          presentToday: Number(todayStats.rows[0].present_today),
          currentlyIn: Number(todayStats.rows[0].currently_in),
          punchedOutToday: Number(todayStats.rows[0].punched_out_today),
        };
      } catch (dbQueryErr) {
        console.warn('[API /status] Failed to fetch live DB stats:', formatDbError(dbQueryErr));
      }
    }

    res.json({
      success: true,
      service: 'HRMS Biometric Terminal',
      aiEngine: aiOnline ? 'Online (InsightFace ArcFace 2.1)' : 'Offline',
      database: dbOnline ? 'Online (PostgreSQL)' : 'Offline (Set DATABASE_URL in Render environment)',
      stats,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: formatDbError(err) });
  }
});

// -------------------------------------------------------------
// 2. Employee Directory
// -------------------------------------------------------------
router.get('/employees', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        employee_code as "employeeCode",
        name,
        email,
        phone,
        department,
        designation,
        company,
        employment_type as "employmentType",
        TO_CHAR(joining_date, 'YYYY-MM-DD') as "joiningDate",
        status,
        face_registered as "faceRegistered",
        face_registered_at as "faceRegisteredAt"
      FROM employees
      ORDER BY employee_code ASC;
    `);
    res.json({ success: true, employees: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: formatDbError(err) });
  }
});

// -------------------------------------------------------------
// 3. Lookup Single Employee by Employee Code (for Registration)
// -------------------------------------------------------------
router.get('/employees/:employeeCode', async (req, res) => {
  const code = (req.params.employeeCode || '').trim().toUpperCase();
  try {
    const result = await query(
      `
      SELECT 
        employee_code as "employeeCode",
        name,
        email,
        phone,
        department,
        designation,
        company,
        employment_type as "employmentType",
        TO_CHAR(joining_date, 'YYYY-MM-DD') as "joiningDate",
        status,
        face_registered as "faceRegistered",
        face_registered_at as "faceRegisteredAt"
      FROM employees
      WHERE UPPER(employee_code) = $1;
      `,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Employee Code "${code}" is not recognized. Only pre-authorized employees in company records can register. \nPlease Contact to Admin...`,
      });
    }

    res.json({ success: true, employee: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: formatDbError(err) });
  }
});

// -------------------------------------------------------------
// 4. Face Registration Endpoint
// -------------------------------------------------------------
router.post('/biometrics/register', async (req, res) => {
  const { employeeCode, image } = req.body;
  const code = (employeeCode || '').trim().toUpperCase();

  if (!code) {
    return res.status(400).json({ success: false, error: 'Employee code is required.' });
  }
  if (!image) {
    return res.status(400).json({ success: false, error: 'Face image capture is required.' });
  }

  try {
    // 1. Verify employee exists in pre-seeded catalog
    const empResult = await query(
      `SELECT employee_code, name, department, designation, face_registered FROM employees WHERE UPPER(employee_code) = $1`,
      [code]
    );

    if (empResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Cannot register: Employee Code "${code}" is not in company database.`,
      });
    }

    const employee = empResult.rows[0];

    // 2. Call InsightFace to extract face embedding & validate single face
    const extractResult = await extractFace(image);
    if (!extractResult.success) {
      // Log failed registration attempt
      await query(
        `INSERT INTO punch_logs (employee_code, employee_name, punch_type, status, message)
         VALUES ($1, $2, 'REGISTER', 'FAILED', $3)`,
        [code, employee.name, extractResult.error]
      );
      return res.status(422).json(extractResult);
    }

    const embedding = extractResult.embedding; // 512-dim float array

    // 3. Update employee record with face embedding
    await query(
      `
      UPDATE employees
      SET 
        face_registered = TRUE,
        face_embedding = $1,
        face_registered_at = NOW(),
        updated_at = NOW()
      WHERE UPPER(employee_code) = $2;
      `,
      [JSON.stringify(embedding), code]
    );

    // 4. Insert success audit log
    await query(
      `INSERT INTO punch_logs (employee_code, employee_name, punch_type, status, message, confidence_score)
       VALUES ($1, $2, 'REGISTER', 'SUCCESS', $3, $4)`,
      [
        code,
        employee.name,
        `Face biometric registered successfully (Det score: ${extractResult.detScore})`,
        extractResult.detScore,
      ]
    );

    res.json({
      success: true,
      message: `Face biometric successfully registered for ${employee.name} (${code})!`,
      employee: {
        employeeCode: employee.employee_code,
        name: employee.name,
        department: employee.department,
        designation: employee.designation,
        faceRegistered: true,
      },
      detScore: extractResult.detScore,
      bbox: extractResult.bbox,
    });
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({ success: false, error: formatDbError(err) });
  }
});

// -------------------------------------------------------------
// 5. Punch In Endpoint (Via Face)
// -------------------------------------------------------------
router.post('/biometrics/punch-in', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ success: false, error: 'Live camera image capture is required.' });
  }

  try {
    // 1. Fetch all registered employee embeddings from PostgreSQL
    const registeredEmployeesResult = await query(`
      SELECT 
        employee_code as "employeeCode",
        name,
        department,
        designation,
        status,
        face_embedding as "embedding"
      FROM employees
      WHERE face_registered = TRUE AND face_embedding IS NOT NULL;
    `);

    if (registeredEmployeesResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No registered face biometrics in the system yet. Please complete Face Registration first.',
      });
    }

    // 2. Perform AI face matching via InsightFace
    const threshold = Number(process.env.FACE_SIMILARITY_THRESHOLD) || 0.50;
    const matchResult = await matchFace(image, registeredEmployeesResult.rows, threshold);

    if (!matchResult.success) {
      return res.status(422).json(matchResult);
    }

    if (!matchResult.matched) {
      // Log unrecognized attempt
      await query(
        `INSERT INTO punch_logs (punch_type, status, message, confidence_score)
         VALUES ('IN', 'REJECTED', $1, $2)`,
        [
          `Unrecognized face attempt (Max similarity: ${matchResult.similarity || 0})`,
          matchResult.similarity || 0,
        ]
      );
      return res.status(401).json({
        success: false,
        error: 'Face not recognized! Please ensure your face is registered or align your face properly.',
        similarity: matchResult.similarity,
        threshold,
      });
    }

    const matchedCode = matchResult.employeeCode;
    const employeeName = matchResult.employeeName;

    // 3. Verify employee is Active
    const empStatusResult = await query(
      `SELECT status FROM employees WHERE employee_code = $1`,
      [matchedCode]
    );
    if (empStatusResult.rows.length > 0 && empStatusResult.rows[0].status !== 'Active') {
      return res.status(403).json({
        success: false,
        error: `Punch In denied: Account for ${employeeName} is inactive/suspended.`,
      });
    }

    // 4. Edge Case: Check today's active attendance session
    const existingAttendance = await query(
      `
      SELECT id, punch_in_time, punch_out_time, date
      FROM attendances
      WHERE employee_code = $1 AND date = CURRENT_DATE
      ORDER BY id DESC
      LIMIT 1;
      `,
      [matchedCode]
    );

    if (existingAttendance.rows.length > 0 && existingAttendance.rows[0].punch_out_time === null) {
      const activePunchInTime = existingAttendance.rows[0].punch_in_time;
      const formattedTime = formatTime12(activePunchInTime);

      // Audit log
      await query(
        `INSERT INTO punch_logs (employee_code, employee_name, punch_type, status, message, confidence_score)
         VALUES ($1, $2, 'IN', 'REJECTED', $3, $4)`,
        [
          matchedCode,
          employeeName,
          `Already punched in at ${formattedTime}`,
          matchResult.similarity,
        ]
      );

      return res.status(400).json({
        success: false,
        alreadyPunchedIn: true,
        error: `Already Punched In! ${employeeName} is currently on duty since ${formattedTime}. Please Punch Out first.`,
        employee: {
          employeeCode: matchedCode,
          name: employeeName,
          department: matchResult.department,
          designation: matchResult.designation,
        },
        punchInTime: activePunchInTime,
        formattedPunchInTime: formattedTime,
      });
    }

    // 5. Create new Attendance Punch In record
    const insertResult = await query(
      `
      INSERT INTO attendances (
        employee_code, employee_name, department, designation,
        date, punch_in_time, status, confidence_score
      )
      VALUES ($1, $2, $3, $4, CURRENT_DATE, NOW(), 'Punched In', $5)
      RETURNING *;
      `,
      [
        matchedCode,
        employeeName,
        matchResult.department,
        matchResult.designation,
        matchResult.similarity,
      ]
    );

    const record = insertResult.rows[0];
    const formattedPunchIn = formatTime12(record.punch_in_time);

    // Audit log
    await query(
      `INSERT INTO punch_logs (employee_code, employee_name, punch_type, status, message, confidence_score)
       VALUES ($1, $2, 'IN', 'SUCCESS', $3, $4)`,
      [
        matchedCode,
        employeeName,
        `Punched In successfully at ${formattedPunchIn} (${matchResult.confidencePercent}% match)`,
        matchResult.similarity,
      ]
    );

    res.json({
      success: true,
      message: `Punch In Verified! Welcome ${employeeName}. Have a productive day!`,
      attendanceId: record.id,
      employee: {
        employeeCode: matchedCode,
        name: employeeName,
        department: matchResult.department,
        designation: matchResult.designation,
      },
      punchInTime: record.punch_in_time,
      formattedTime: formattedPunchIn,
      confidenceScore: matchResult.similarity,
      confidencePercent: matchResult.confidencePercent,
      bbox: matchResult.bbox,
    });
  } catch (err) {
    console.error('[Punch-In Error]', err);
    res.status(500).json({ success: false, error: formatDbError(err) });
  }
});

// -------------------------------------------------------------
// 6. Punch Out Endpoint (Via Face)
// -------------------------------------------------------------
router.post('/biometrics/punch-out', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ success: false, error: 'Live camera image capture is required.' });
  }

  try {
    // 1. Fetch registered employee embeddings
    const registeredEmployeesResult = await query(`
      SELECT 
        employee_code as "employeeCode",
        name,
        department,
        designation,
        status,
        face_embedding as "embedding"
      FROM employees
      WHERE face_registered = TRUE AND face_embedding IS NOT NULL;
    `);

    if (registeredEmployeesResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No registered face biometrics found. Cannot punch out.',
      });
    }

    // 2. Perform AI face matching
    const threshold = Number(process.env.FACE_SIMILARITY_THRESHOLD) || 0.50;
    const matchResult = await matchFace(image, registeredEmployeesResult.rows, threshold);

    if (!matchResult.success) {
      return res.status(422).json(matchResult);
    }

    if (!matchResult.matched) {
      await query(
        `INSERT INTO punch_logs (punch_type, status, message, confidence_score)
         VALUES ('OUT', 'REJECTED', $1, $2)`,
        [
          `Unrecognized face attempt on Punch Out (Max similarity: ${matchResult.similarity || 0})`,
          matchResult.similarity || 0,
        ]
      );
      return res.status(401).json({
        success: false,
        error: 'Face not recognized! Biometric profile did not match any registered employee.',
        similarity: matchResult.similarity,
        threshold,
      });
    }

    const matchedCode = matchResult.employeeCode;
    const employeeName = matchResult.employeeName;

    // 3. Edge Case: Verify user had an active Punch In session today
    const attendanceSession = await query(
      `
      SELECT id, punch_in_time, punch_out_time, total_work_formatted, date
      FROM attendances
      WHERE employee_code = $1 AND date = CURRENT_DATE
      ORDER BY id DESC
      LIMIT 1;
      `,
      [matchedCode]
    );

    // If no attendance record at all today:
    if (attendanceSession.rows.length === 0) {
      await query(
        `INSERT INTO punch_logs (employee_code, employee_name, punch_type, status, message, confidence_score)
         VALUES ($1, $2, 'OUT', 'REJECTED', 'Cannot punch out without punch in first', $3)`,
        [matchedCode, employeeName, matchResult.similarity]
      );
      return res.status(400).json({
        success: false,
        error: `Cannot Punch Out! No active Punch In record found for ${employeeName} today. An employee must Punch In before punching out!`,
        employee: {
          employeeCode: matchedCode,
          name: employeeName,
        },
      });
    }

    const latestRecord = attendanceSession.rows[0];

    // If already punched out:
    if (latestRecord.punch_out_time !== null) {
      const formattedPunchOut = formatTime12(latestRecord.punch_out_time);
      await query(
        `INSERT INTO punch_logs (employee_code, employee_name, punch_type, status, message, confidence_score)
         VALUES ($1, $2, 'OUT', 'REJECTED', $3, $4)`,
        [
          matchedCode,
          employeeName,
          `Already punched out at ${formattedPunchOut}`,
          matchResult.similarity,
        ]
      );
      return res.status(400).json({
        success: false,
        alreadyPunchedOut: true,
        error: `${employeeName} has already Punched Out today at ${formattedPunchOut}. Total logged work: ${latestRecord.total_work_formatted || 'N/A'}.`,
        employee: {
          employeeCode: matchedCode,
          name: employeeName,
        },
        punchInTime: latestRecord.punch_in_time,
        punchOutTime: latestRecord.punch_out_time,
        totalWorkFormatted: latestRecord.total_work_formatted,
      });
    }

    // 4. Calculate total work hours / minutes
    const now = new Date();
    const punchInDate = new Date(latestRecord.punch_in_time);
    const diffMs = now.getTime() - punchInDate.getTime();
    const totalMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    const formattedDuration = formatWorkDuration(diffMs);

    // 5. Update attendance record with Punch Out
    const updateResult = await query(
      `
      UPDATE attendances
      SET 
        punch_out_time = NOW(),
        total_work_minutes = $1,
        total_work_formatted = $2,
        status = 'Completed',
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
      `,
      [totalMinutes, formattedDuration, latestRecord.id]
    );

    const updated = updateResult.rows[0];
    const formattedPunchIn = formatTime12(updated.punch_in_time);
    const formattedPunchOut = formatTime12(updated.punch_out_time);

    // Audit log
    await query(
      `INSERT INTO punch_logs (employee_code, employee_name, punch_type, status, message, confidence_score)
       VALUES ($1, $2, 'OUT', 'SUCCESS', $3, $4)`,
      [
        matchedCode,
        employeeName,
        `Punched Out at ${formattedPunchOut}. Duration: ${formattedDuration} (${matchResult.confidencePercent}% match)`,
        matchResult.similarity,
      ]
    );

    res.json({
      success: true,
      message: `Punch Out Confirmed! Goodbye ${employeeName}. Great work today!`,
      attendanceId: updated.id,
      employee: {
        employeeCode: matchedCode,
        name: employeeName,
        department: matchResult.department,
        designation: matchResult.designation,
      },
      punchInTime: updated.punch_in_time,
      punchOutTime: updated.punch_out_time,
      formattedPunchInTime: formattedPunchIn,
      formattedPunchOutTime: formattedPunchOut,
      totalWorkMinutes: totalMinutes,
      totalWorkFormatted: formattedDuration,
      confidenceScore: matchResult.similarity,
      confidencePercent: matchResult.confidencePercent,
      bbox: matchResult.bbox,
    });
  } catch (err) {
    console.error('[Punch-Out Error]', err);
    res.status(500).json({ success: false, error: formatDbError(err) });
  }
});

// -------------------------------------------------------------
// 7. Today's Attendance List
// -------------------------------------------------------------
router.get('/attendance/today', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id,
        employee_code as "employeeCode",
        employee_name as "employeeName",
        department,
        designation,
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        punch_in_time as "punchInTime",
        punch_out_time as "punchOutTime",
        total_work_minutes as "totalWorkMinutes",
        total_work_formatted as "totalWorkFormatted",
        status,
        confidence_score as "confidenceScore",
        device_info as "deviceInfo",
        created_at as "createdAt"
      FROM attendances
      WHERE date = CURRENT_DATE
      ORDER BY id DESC;
    `);
    res.json({ success: true, attendances: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: formatDbError(err) });
  }
});

// -------------------------------------------------------------
// 8. Audit / Activity Logs
// -------------------------------------------------------------
router.get('/attendance/logs', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id,
        employee_code as "employeeCode",
        employee_name as "employeeName",
        punch_type as "punchType",
        status,
        message,
        confidence_score as "confidenceScore",
        timestamp
      FROM punch_logs
      ORDER BY id DESC
      LIMIT 50;
    `);
    res.json({ success: true, logs: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: formatDbError(err) });
  }
});

module.exports = router;
