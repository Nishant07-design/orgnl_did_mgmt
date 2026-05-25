const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_DIR = __dirname;

// JSON file paths
const FILES = {
  users: path.join(DB_DIR, 'data/users.json'),
  incidents: path.join(DB_DIR, 'data/incidents.json'),
  shelters: path.join(DB_DIR, 'data/shelters.json'),
  alerts: path.join(DB_DIR, 'data/alerts.json'),
  rescue_operations: path.join(DB_DIR, 'data/rescue_operations.json'),
};

// Create data directory if it doesn't exist
if (!fs.existsSync(path.join(DB_DIR, 'data'))) {
  fs.mkdirSync(path.join(DB_DIR, 'data'), { recursive: true });
}

// Helper functions
function loadData(table) {
  const filePath = FILES[table];
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveData(table, data) {
  fs.writeFileSync(FILES[table], JSON.stringify(data, null, 2), 'utf8');
}

function getNextId(table) {
  const data = loadData(table);
  if (data.length === 0) return 1;
  return Math.max(...data.map(item => item.id || 0)) + 1;
}

function getDate() {
  return new Date().toISOString();
}

// Database object mimicking better-sqlite3 API
const db = {
  prepare: function(sql) {
    return {
      run: function(...params) {
        const result = parseAndExecute('run', sql, params);
        return { lastInsertRowid: result.lastId };
      },
      get: function(...params) {
        return parseAndExecute('get', sql, params);
      },
      all: function(...params) {
        return parseAndExecute('all', sql, params);
      }
    };
  },
  exec: function(sqlStatements) {
    // Initialize all tables with seed data
    initializeTables();
  }
};

function parseAndExecute(mode, sql, params) {
  // Determine table from SQL
  const insertMatch = sql.match(/INSERT INTO (\w+)/i);
  const selectMatch = sql.match(/SELECT.*FROM (\w+)/i);
  const updateMatch = sql.match(/UPDATE (\w+)/i);
  const deleteMatch = sql.match(/DELETE FROM (\w+)/i);

  let table = insertMatch ? insertMatch[1] : 
              selectMatch ? selectMatch[1] :
              updateMatch ? updateMatch[1] :
              deleteMatch ? deleteMatch[1] : null;

  // Handle JOIN queries
  if (sql.includes('LEFT JOIN')) {
    return handleJoinQuery(sql, params, mode);
  }

  if (sql.includes('INSERT')) {
    return handleInsert(table, sql, params);
  }
  if (sql.includes('UPDATE')) {
    return handleUpdate(table, sql, params);
  }
  if (sql.includes('GROUP BY')) {
    return handleGroupBy(table, sql, params, mode);
  }
  if (sql.includes('SELECT') && sql.includes('COUNT')) {
    return handleCount(table, sql, params, mode);
  }
  if (sql.includes('SELECT') && sql.includes('SUM')) {
    return handleSum(table, sql, params, mode);
  }
  if (sql.includes('SELECT') && sql.includes('DISTINCT')) {
    return handleDistinct(table, sql, params, mode);
  }
  if (sql.includes('SELECT')) {
    return handleSelect(table, sql, params, mode);
  }
}

function handleInsert(table, sql, params) {
  const data = loadData(table);
  const id = getNextId(table);
  
  // Parse column names from INSERT statement
  const colMatch = sql.match(/INSERT INTO \w+\s*\((.*?)\)\s*VALUES/i);
  const columns = colMatch ? colMatch[1].split(',').map(c => c.trim()) : [];
  
  const record = { id };
  columns.forEach((col, idx) => {
    record[col] = params[idx] || null;
  });
  
  // Add timestamps
  if (!record.created_at) record.created_at = getDate();
  if (!record.updated_at) record.updated_at = getDate();
  
  data.push(record);
  saveData(table, data);
  
  return { lastId: id };
}

function handleUpdate(table, sql, params) {
  const data = loadData(table);
  
  // Extract SET and WHERE parts
  const setMatch = sql.match(/SET\s+(.*?)\s+WHERE/i);
  const whereMatch = sql.match(/WHERE\s+(.*?)$/i);
  
  if (!setMatch || !whereMatch) return null;
  
  const setPart = setMatch[1];
  const wherePart = whereMatch[1];
  
  // Parse SET clause (e.g., "status = ?, updated_at = CURRENT_TIMESTAMP")
  const setters = setPart.split(',').map(s => s.trim());
  const whereParamCount = (whereMatch[1].match(/\?/g) || []).length;
  const setParams = params.slice(0, params.length - whereParamCount);
  const whereParams = params.slice(params.length - whereParamCount);
  
  // Apply updates
  data.forEach(record => {
    if (matchesWhere(record, wherePart, whereParams)) {
      setters.forEach((setter, idx) => {
        if (setter.includes('CURRENT_TIMESTAMP')) {
          record.updated_at = getDate();
        } else if (setter.includes('=')) {
          const parts = setter.split('=').map(p => p.trim());
          const col = parts[0];
          if (idx < setParams.length) {
            record[col] = setParams[idx];
          }
        }
      });
    }
  });
  
  saveData(table, data);
  return { changes: 1 };
}

function handleSelect(table, sql, params, mode) {
  let data = loadData(table);
  
  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.*?)(?:ORDER|GROUP|LIMIT|$)/i);
  if (whereMatch) {
    const wherePart = whereMatch[1];
    data = data.filter(record => matchesWhere(record, wherePart, params));
  }
  
  // Handle ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+([^\s]+)\s+(ASC|DESC)?(?:\s|$)/i);
  if (orderMatch) {
    const orderCol = orderMatch[1];
    const desc = orderMatch[2] === 'DESC';
    data.sort((a, b) => {
      const aVal = a[orderCol] || '';
      const bVal = b[orderCol] || '';
      return desc ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });
  }
  
  // Handle LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    data = data.slice(0, parseInt(limitMatch[1]));
  }
  
  return mode === 'get' ? (data.length > 0 ? data[0] : null) : data;
}

function handleCount(table, sql, params, mode) {
  let data = loadData(table);
  
  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.*?)(?:ORDER|GROUP|LIMIT|$)/i);
  if (whereMatch) {
    const wherePart = whereMatch[1];
    data = data.filter(record => matchesWhere(record, wherePart, params));
  }
  
  return mode === 'get' ? { c: data.length } : [{ c: data.length }];
}

function handleSum(table, sql, params, mode) {
  let data = loadData(table);
  
  // Extract SUM column
  const sumMatch = sql.match(/SUM\((\w+)\)/i);
  const sumCol = sumMatch ? sumMatch[1] : null;
  
  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.*?)(?:ORDER|GROUP|LIMIT|$)/i);
  if (whereMatch) {
    const wherePart = whereMatch[1];
    data = data.filter(record => matchesWhere(record, wherePart, params));
  }
  
  const sum = sumCol ? data.reduce((acc, item) => acc + (parseInt(item[sumCol]) || 0), 0) : 0;
  return mode === 'get' ? { s: sum } : [{ s: sum }];
}

function handleDistinct(table, sql, params, mode) {
  let data = loadData(table);
  
  // Extract DISTINCT column
  const distinctMatch = sql.match(/SELECT DISTINCT\s+(\w+)/i);
  const distinctCol = distinctMatch ? distinctMatch[1] : null;
  
  if (!distinctCol) return mode === 'get' ? null : [];
  
  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.*?)(?:ORDER|GROUP|LIMIT|$)/i);
  if (whereMatch) {
    const wherePart = whereMatch[1];
    data = data.filter(record => matchesWhere(record, wherePart, params));
  }
  
  // Get distinct values
  const seen = new Set();
  const result = [];
  data.forEach(record => {
    const val = record[distinctCol];
    if (val && !seen.has(val)) {
      seen.add(val);
      result.push({ [distinctCol]: val });
    }
  });
  
  // Handle ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+([^\s]+)\s+(ASC|DESC)?(?:\s|$)/i);
  if (orderMatch) {
    const orderCol = orderMatch[1];
    const desc = orderMatch[2] === 'DESC';
    result.sort((a, b) => {
      const aVal = a[orderCol] || '';
      const bVal = b[orderCol] || '';
      return desc ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });
  }
  
  return mode === 'get' ? (result.length > 0 ? result[0] : null) : result;
}

function handleGroupBy(table, sql, params, mode) {
  let data = loadData(table);
  
  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.*?)(?:GROUP|ORDER|LIMIT|$)/i);
  if (whereMatch) {
    const wherePart = whereMatch[1];
    data = data.filter(record => matchesWhere(record, wherePart, params));
  }
  
  // Extract GROUP BY column
  const groupMatch = sql.match(/GROUP BY\s+(\w+)/i);
  const groupCol = groupMatch ? groupMatch[1] : null;
  
  if (!groupCol) return mode === 'get' ? null : [];
  
  // Extract aggregate functions
  const countMatch = sql.match(/COUNT\(\*\)\s+as\s+(\w+)/i);
  const countAlias = countMatch ? countMatch[1] : 'count';
  
  const sumMatch = sql.match(/SUM\((\w+)\)\s+as\s+(\w+)/i);
  const sumCol = sumMatch ? sumMatch[1] : null;
  const sumAlias = sumMatch ? sumMatch[2] : 's';
  
  // Group data
  const grouped = {};
  data.forEach(record => {
    const key = record[groupCol];
    if (!grouped[key]) {
      grouped[key] = {
        [groupCol]: key,
        [countAlias]: 0,
      };
      if (sumCol) grouped[key][sumAlias] = 0;
    }
    grouped[key][countAlias]++;
    if (sumCol) {
      grouped[key][sumAlias] += parseInt(record[sumCol]) || 0;
    }
  });
  
  const result = Object.values(grouped);
  
  // Handle ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+([^\s]+)\s+(ASC|DESC)?(?:\s|$)/i);
  if (orderMatch) {
    const orderCol = orderMatch[1];
    const desc = orderMatch[2] === 'DESC';
    result.sort((a, b) => {
      const aVal = a[orderCol] || '';
      const bVal = b[orderCol] || '';
      return desc ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });
  }
  
  return mode === 'get' ? (result.length > 0 ? result[0] : null) : result;
}

function handleJoinQuery(sql, params, mode) {
  // Handle LEFT JOIN queries
  if (sql.includes('incidents i LEFT JOIN users u')) {
    return handleIncidentUserJoin(sql, params, mode);
  }
  if (sql.includes('alerts a LEFT JOIN users u')) {
    return handleAlertUserJoin(sql, params, mode);
  }
  if (sql.includes('rescue_operations r JOIN incidents i')) {
    return handleRescueIncidentJoin(sql, params, mode);
  }
  
  return mode === 'get' ? null : [];
}

function handleIncidentUserJoin(sql, params, mode) {
  let incidents = loadData('incidents');
  let users = loadData('users');
  
  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.*?)(?:ORDER|GROUP|LIMIT|$)/i);
  if (whereMatch) {
    const wherePart = whereMatch[1];
    incidents = incidents.filter(record => matchesWhere(record, wherePart, params));
  }
  
  // Join incidents with users
  const result = incidents.map(incident => {
    const user = users.find(u => u.id === incident.reported_by);
    return {
      ...incident,
      reporter_name: user ? user.name : null
    };
  });
  
  // Handle ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+([^\s]+)\s+(ASC|DESC)?(?:\s|$)/i);
  if (orderMatch) {
    const orderCol = orderMatch[1];
    const desc = orderMatch[2] === 'DESC';
    result.sort((a, b) => {
      const aVal = a[orderCol] || '';
      const bVal = b[orderCol] || '';
      return desc ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });
  }
  
  // Handle LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    result.splice(limitMatch[1]);
  }
  
  return mode === 'get' ? (result.length > 0 ? result[0] : null) : result;
}

function handleAlertUserJoin(sql, params, mode) {
  let alerts = loadData('alerts');
  let users = loadData('users');
  
  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.*?)(?:ORDER|GROUP|LIMIT|$)/i);
  if (whereMatch) {
    const wherePart = whereMatch[1];
    alerts = alerts.filter(record => matchesWhere(record, wherePart, params));
  }
  
  // Join alerts with users
  const result = alerts.map(alert => {
    const user = users.find(u => u.id === alert.created_by);
    return {
      ...alert,
      creator_name: user ? user.name : null
    };
  });
  
  // Handle ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+([^\s]+)\s+(ASC|DESC)?(?:\s|$)/i);
  if (orderMatch) {
    const orderCol = orderMatch[1];
    const desc = orderMatch[2] === 'DESC';
    result.sort((a, b) => {
      const aVal = a[orderCol] || '';
      const bVal = b[orderCol] || '';
      return desc ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });
  }
  
  // Handle LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    result.splice(limitMatch[1]);
  }
  
  return mode === 'get' ? (result.length > 0 ? result[0] : null) : result;
}

function handleRescueIncidentJoin(sql, params, mode) {
  let rescueOps = loadData('rescue_operations');
  let incidents = loadData('incidents');
  
  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.*?)(?:ORDER|GROUP|LIMIT|$)/i);
  if (whereMatch) {
    const wherePart = whereMatch[1];
    rescueOps = rescueOps.filter(record => matchesWhere(record, wherePart, params));
  }
  
  // Join rescue_operations with incidents
  const result = rescueOps.map(op => {
    const incident = incidents.find(i => i.id === op.incident_id);
    return {
      ...op,
      incident_title: incident ? incident.title : null,
      location: incident ? incident.location : null
    };
  });
  
  // Handle ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+([^\s]+)\s+(ASC|DESC)?(?:\s|$)/i);
  if (orderMatch) {
    const orderCol = orderMatch[1];
    const desc = orderMatch[2] === 'DESC';
    result.sort((a, b) => {
      const aVal = a[orderCol] || '';
      const bVal = b[orderCol] || '';
      return desc ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });
  }
  
  // Handle LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    result.splice(limitMatch[1]);
  }
  
  return mode === 'get' ? (result.length > 0 ? result[0] : null) : result;
}

function matchesWhere(record, whereClause, params) {
  // Simple WHERE clause matching
  let paramIndex = 0;
  
  if (whereClause === '1=1') return true;
  
  // Split by AND
  const conditions = whereClause.split(/\s+AND\s+/i);
  
  return conditions.every(condition => {
    // Handle different condition types
    if (condition.includes('=') && condition.includes('?')) {
      const parts = condition.split('=').map(p => p.trim());
      const col = parts[0];
      const param = params[paramIndex];
      paramIndex++;
      return record[col] == param;
    }
    if (condition.includes('!=') && condition.includes('?')) {
      const parts = condition.split('!=').map(p => p.trim());
      const col = parts[0];
      const param = params[paramIndex];
      paramIndex++;
      return record[col] != param;
    }
    if (condition.includes('date(')) {
      // date(updated_at) = date('now')
      if (record.updated_at) {
        const recordDate = record.updated_at.split('T')[0];
        const todayDate = new Date().toISOString().split('T')[0];
        return recordDate === todayDate;
      }
    }
    if (condition.includes('!=') && condition.includes('"')) {
      const parts = condition.split('!=').map(p => p.trim());
      const col = parts[0];
      const value = parts[1].replace(/"/g, '');
      return record[col] != value;
    }
    return true;
  });
}

function initializeTables() {
  // Check if data already exists
  if (fs.existsSync(FILES.users) && loadData('users').length > 0) {
    return; // Data already initialized
  }
  
  // Initialize users
  let users = [];
  const adminHash = bcrypt.hashSync('admin123', 10);
  const citizenHash = bcrypt.hashSync('citizen123', 10);
  
  users.push({
    id: 1,
    name: 'Admin NDRF',
    email: 'admin@ndrf.gov.in',
    password: adminHash,
    role: 'admin',
    phone: '011-24363260',
    state: 'Delhi',
    created_at: getDate()
  });
  
  users.push({
    id: 2,
    name: 'Rahul Sharma',
    email: 'rahul@citizen.in',
    password: citizenHash,
    role: 'citizen',
    phone: '9876543210',
    state: 'Maharashtra',
    created_at: getDate()
  });
  
  saveData('users', users);
  
  // Initialize shelters
  const shelters = [
    { id: 1, name: 'Rajiv Gandhi Community Hall', address: 'Sector 15, Rohini', district: 'North Delhi', state: 'Delhi', lat: 28.7225, lng: 77.1123, capacity: 500, current_occupancy: 230, contact: '011-27559900', facilities: 'Food,Water,Medical,Beds', status: 'open', created_at: getDate() },
    { id: 2, name: 'VMSS Relief Camp', address: 'Andheri West, Near Station', district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.1197, lng: 72.8464, capacity: 800, current_occupancy: 450, contact: '022-26241234', facilities: 'Food,Water,Medical,Beds,Toilets', status: 'open', created_at: getDate() },
    { id: 3, name: 'Red Cross Shelter', address: 'Mylapore, Chennai', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0337, lng: 80.2674, capacity: 300, current_occupancy: 120, contact: '044-28521131', facilities: 'Food,Water,Medical', status: 'open', created_at: getDate() },
    { id: 4, name: 'Odisha Shelter Unit 3', address: 'Puri Beach Road', district: 'Puri', state: 'Odisha', lat: 19.7999, lng: 85.8179, capacity: 600, current_occupancy: 540, contact: '0674-2598765', facilities: 'Food,Water,Medical,Beds', status: 'full', created_at: getDate() },
    { id: 5, name: 'Army Relief Camp', address: 'Srinagar Cantonment', district: 'Srinagar', state: 'Jammu & Kashmir', lat: 34.0837, lng: 74.7973, capacity: 400, current_occupancy: 180, contact: '0194-2452521', facilities: 'Food,Water,Medical,Beds,Heating', status: 'open', created_at: getDate() },
    { id: 6, name: 'SDRF Camp Assam', address: 'Guwahati Sarusajai', district: 'Kamrup Metro', state: 'Assam', lat: 26.1445, lng: 91.7362, capacity: 700, current_occupancy: 290, contact: '0361-2237782', facilities: 'Food,Water,Medical,Beds', status: 'open', created_at: getDate() },
    { id: 7, name: 'Uttarakhand Relief Hub', address: 'Dehradun Clock Tower Area', district: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322, capacity: 350, current_occupancy: 210, contact: '0135-2657382', facilities: 'Food,Water,Medical', status: 'open', created_at: getDate() },
    { id: 8, name: 'Gujarat SRSG Camp', address: 'Bhuj Town Hall', district: 'Kutch', state: 'Gujarat', lat: 23.2519, lng: 69.6669, capacity: 450, current_occupancy: 310, contact: '02832-220099', facilities: 'Food,Water,Medical,Beds', status: 'open', created_at: getDate() },
  ];
  saveData('shelters', shelters);
  
  // Initialize incidents
  const incidents = [
    { id: 1, title: 'Brahmaputra River Flooding', type: 'flood', description: 'Heavy rainfall causing severe flooding. Multiple villages submerged. Evacuation underway.', location: 'Kaziranga, Assam', district: 'Golaghat', state: 'Assam', lat: 26.5775, lng: 93.3687, severity: 'critical', status: 'active', reported_by: 1, responders: 45, affected_people: 3200, created_at: getDate(), updated_at: getDate() },
    { id: 2, title: 'Cyclone Biparjoy Landfall', type: 'cyclone', description: 'Category 3 cyclone making landfall near Dwarka coast. Coastal evacuation ordered.', location: 'Dwarka, Gujarat', district: 'Devbhoomi Dwarka', state: 'Gujarat', lat: 22.2393, lng: 68.9678, severity: 'critical', status: 'active', reported_by: 1, responders: 120, affected_people: 15000, created_at: getDate(), updated_at: getDate() },
    { id: 3, title: 'Uttarkashi Landslide', type: 'landslide', description: 'Cloudburst triggered multiple landslides blocking NH-34. Rescue teams deployed.', location: 'Uttarkashi, Uttarakhand', district: 'Uttarkashi', state: 'Uttarakhand', lat: 30.7268, lng: 78.4354, severity: 'high', status: 'active', reported_by: 1, responders: 30, affected_people: 500, created_at: getDate(), updated_at: getDate() },
    { id: 4, title: 'Mumbai Building Collapse', type: 'earthquake', description: 'Old structure collapsed following tremors. NDRF team conducting search and rescue.', location: 'Kurla West, Mumbai', district: 'Mumbai', state: 'Maharashtra', lat: 19.0728, lng: 72.8826, severity: 'high', status: 'active', reported_by: 2, responders: 25, affected_people: 85, created_at: getDate(), updated_at: getDate() },
    { id: 5, title: 'Forest Fire Uttarakhand', type: 'fire', description: 'Wildfire spreading across Chilla wildlife range. Air Force helicopter deployed.', location: 'Rishikesh, Uttarakhand', district: 'Haridwar', state: 'Uttarakhand', lat: 30.0869, lng: 78.2676, severity: 'medium', status: 'active', reported_by: 1, responders: 20, affected_people: 200, created_at: getDate(), updated_at: getDate() },
    { id: 6, title: 'Earthquake Tremors Delhi NCR', type: 'earthquake', description: 'Magnitude 4.2 earthquake felt across Delhi NCR. No major damage reported. Teams on standby.', location: 'New Delhi', district: 'Central Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, severity: 'low', status: 'resolved', reported_by: 1, responders: 10, affected_people: 0, created_at: getDate(), updated_at: getDate() },
    { id: 7, title: 'Chemical Leak Bhopal', type: 'industrial', description: 'Minor gas leak at industrial unit. Area cordoned off. Residents evacuated as precaution.', location: 'Mandideep, Bhopal', district: 'Raisen', state: 'Madhya Pradesh', lat: 23.0857, lng: 77.5082, severity: 'high', status: 'active', reported_by: 1, responders: 35, affected_people: 420, created_at: getDate(), updated_at: getDate() },
    { id: 8, title: 'Chennai Cyclone Warning', type: 'cyclone', description: 'IMD red alert issued. Bay of Bengal depression intensifying. Fishermen warned not to venture.', location: 'Marina Beach, Chennai', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0499, lng: 80.2824, severity: 'medium', status: 'active', reported_by: 1, responders: 15, affected_people: 50000, created_at: getDate(), updated_at: getDate() },
  ];
  saveData('incidents', incidents);
  
  // Initialize alerts
  const alerts = [
    { id: 1, title: 'RED ALERT - Assam Floods', message: 'Brahmaputra river water level critical. Immediate evacuation of low-lying areas in Kaziranga, Jorhat, Majuli. Contact SDRF: 0361-2237782', severity: 'critical', type: 'evacuation', state: 'Assam', district: 'Golaghat', incident_id: 1, active: 1, created_by: 1, created_at: getDate() },
    { id: 2, title: 'Cyclone Warning - Gujarat Coast', message: 'Cyclone Biparjoy: All coastal residents within 5km of shoreline must evacuate immediately. Relief camps ready.', severity: 'critical', type: 'evacuation', state: 'Gujarat', district: 'Devbhoomi Dwarka', incident_id: 2, active: 1, created_by: 1, created_at: getDate() },
    { id: 3, title: 'IMD Weather Alert - Uttarakhand', message: 'Heavy to very heavy rainfall predicted for next 48 hours. Avoid river banks and landslide-prone areas.', severity: 'high', type: 'weather', state: 'Uttarakhand', district: null, incident_id: null, active: 1, created_by: 1, created_at: getDate() },
    { id: 4, title: 'Heat Wave Advisory - Rajasthan', message: 'Severe heat wave conditions. Temperature exceeding 45°C. Avoid outdoor activity 11am-4pm. Stay hydrated.', severity: 'medium', type: 'health', state: 'Rajasthan', district: null, incident_id: null, active: 1, created_by: 1, created_at: getDate() },
    { id: 5, title: 'Rescue Operation Update', message: 'NDRF teams have successfully rescued 240 persons from flood-affected areas in Assam. Operations continuing.', severity: 'info', type: 'update', state: 'Assam', district: null, incident_id: null, active: 1, created_by: 1, created_at: getDate() },
  ];
  saveData('alerts', alerts);
  
  // Initialize rescue operations
  const rescueOps = [
    { id: 1, incident_id: 1, team_name: 'NDRF Team Alpha', team_type: 'NDRF', personnel: 45, status: 'active', notes: 'Boat rescue operations ongoing in Kaziranga sector', created_at: getDate(), updated_at: getDate() },
    { id: 2, incident_id: 1, team_name: 'SDRF Assam Unit 3', team_type: 'SDRF', personnel: 30, status: 'active', notes: 'Distributing relief materials at Jorhat camp', created_at: getDate(), updated_at: getDate() },
    { id: 3, incident_id: 2, team_name: 'NDRF Gujarat 04', team_type: 'NDRF', personnel: 80, status: 'active', notes: 'Coastal evacuation of Dwarka district', created_at: getDate(), updated_at: getDate() },
    { id: 4, incident_id: 3, team_name: 'BRO Team Uttarkashi', team_type: 'BRO', personnel: 25, status: 'active', notes: 'Road clearing operations NH-34 landslide point', created_at: getDate(), updated_at: getDate() },
    { id: 5, incident_id: 4, team_name: 'NDRF Mumbai Fast Response', team_type: 'NDRF', personnel: 20, status: 'active', notes: 'Search and rescue at Kurla collapse site', created_at: getDate(), updated_at: getDate() },
  ];
  saveData('rescue_operations', rescueOps);
}

// Initialize data on module load
initializeTables();

module.exports = db;
