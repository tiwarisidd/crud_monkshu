/*
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

// Custom modules
const mysql = require(`${CONSTANTS.APPROOTDIR}/sample/3p/node_modules/mysql`);
const utils = require("./utils");
const mysqlConfig = require(`${CONSTANTS.APPROOTDIR}/sample/conf/config`).MYSQL;

/**
 * Get a fresh pool from mysql for connection
 *
 * @returns {Promise<object>} - pool object if acquired else boolean false
 */
const getPool = () => {
  return new Promise((resolve, reject) => {
    try {
      if (!mysqlConfig)
        return reject("Db configuration file is not setup properly.");

      const pool = mysql.createPool(mysqlConfig);
      // Ping database to check for common exception errors.
      pool.getConnection((error, connection) => {
        if (error) {
          if (error.code === "PROTOCOL_CONNECTION_LOST")
            console.error("Database connection was closed.");
          if (error.code === "ER_CON_COUNT_ERROR")
            console.error("Database has too many connections.");
          if (error.code === "ECONNREFUSED")
            console.error("Database connection was refused.");
          return reject(error);
        }
        if (connection) connection.destroy();
      });
      resolve(pool);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * This will give fresh connection using pool
 *
 * @returns {Promise<object>} - connection object to query database
 */
const getConnection = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const pool = await getPool();
      if (!pool)
        return reject("Unable to get pool inside getConnection function.");
      pool.getConnection((error, connection) => {
        if (error) return reject(error);
        resolve(connection);
      });
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * This will release passed connection if found active
 *
 * @param {*} connection - Active connection object
 *
 * @returns {Boolean} - true/false - returns true if connection released else false
 */
const releaseConnection = connection => {
  if (!connection) return false;
  connection.destroy();
  return true;
};

/**
 * This function used to start db transaction
 *
 * @returns {Promise<object>} - Returns connection object if transaction starts successfully else false
 */
const beginTransaction = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const connection = await getConnection();
      if (!connection)
        return reject("Connection not found inside beginTransaction function.");
      connection.beginTransaction(error => {
        if (error) return reject(error);
        resolve(connection);
      });
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * This function used to rollback any db changes happened when db transaction is active
 *
 * @param {Object} connection - Connection object having active db transaction going on
 * @returns {Boolean} true/false - returns true if rollback happens else false
 */
const rollBack = connection => {
  return new Promise((resolve, reject) => {
    try {
      if (!connection) return resolve(false);
      connection.rollback(() => {
        connection.destroy();
        resolve(true);
      });
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * This function used to commit all changes happened on db transaction
 *
 * @param {Object} connection - Connection object having active db transaction
 * @returns {Boolean} - Returns  connection object if all changes committed successfully else false
 */
const commit = connection => {
  return new Promise((resolve, reject) => {
    try {
      if (!connection)
        return reject("Connection not found inside commit function.");
      connection.commit(error => {
        if (error) return reject(error);
        connection.destroy();
        resolve(true);
      });
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * This function can be used to perform select only, after query connection get closed
 *
 * Sample query = `SELECT * FROM users WHERE email=?`
 * Sample queryParams = [user@example.com]
 *
 * @param {String} query - SQL Query to be processed
 * @param {Array} queryParams - Array of query parameters
 * @returns {Promise<boolean|object>} - Returns records as array Object else false
 */
const simpleSelect = (query, queryParams) => {
  return new Promise(async (resolve, reject) => {
    try {
      const connection = await getConnection();
      if (!connection) return reject("Connection not found");
      // Use the connection
      const queryStats = connection.query(
        query,
        queryParams,
        (error, results) => {
          // When done with the connection, release it.
          releaseConnection(connection);
          // error will be an Error if one occurred during the query
          if (error) return reject(error);
          if (!results || results.length == 0) return resolve(false);
          // results will contain the results of the query
          resolve(results);
        }
      );
      utils.captureInfoLog(utils.stripString(queryStats.sql));
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * consecutiveSelect function needs to be used for select on connection having active db Transaction
 *
 * Sample query = `SELECT * FROM users WHERE email=?`
 * Sample queryParams = [user@example.com]
 *
 * @param {String} query - SQL Query to be processed
 * @param {Array} queryParams - Array of query parameters
 * @returns {Promise<boolean|object>} - Returns records as array Object else false
 */
const consecutiveSelect = (connection, query, queryParams) => {
  return new Promise((resolve, reject) => {
    try {
      if (!connection)
        return reject(
          "Connection not found inside consecutiveSelect function."
        );
      const queryStats = connection.query(
        query,
        queryParams,
        (error, results) => {
          // error will be an Error if one occurred during the query
          if (error) return reject(error);
          if (!results || results.length == 0) return resolve(false);
          // results will contain the results of the query
          resolve(results);
        }
      );
      utils.captureInfoLog(utils.stripString(queryStats.sql));
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * This function can be used to perform insert only, after query connection get closed
 *
 * Sample tableName = "users"
 * Sample queryParams = {"email":"user@example.com"}
 *
 * @param {String} tableName - tableName
 * @param {Array} queryParams - Json Object of query parameters
 * @returns {Promise<boolean|string>} - Returns Error/true/false
 */
const simpleInsert = (tableName, queryParams) => {
  return new Promise(async (resolve, reject) => {
    try {
      const connection = await getConnection();
      if (!connection) return reject("Connection not found");
      const query = `INSERT INTO ${tableName} SET ?`;
      // Use the connection
      const queryStats = connection.query(
        query,
        queryParams,
        (error, results) => {
          // When done with the connection, release it.
          releaseConnection(connection);
          // error will be an Error if one occurred during the query
          if (error) return reject(error);
          if (!results || !results.insertId) return resolve(false);
          // results will contain the results of the query
          resolve(results.insertId);
        }
      );
      utils.captureInfoLog(utils.stripString(queryStats.sql));
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * This function can be used to perform insert on connection having active db Transaction
 *
 * Sample tableName = "users"
 * Sample queryParams = {"email":"user@example.com"}
 *
 * @param {String} tableName - tableName
 * @param {Array} queryParams - Json Object of query parameters
 * @returns {Promise<boolean|string>} - Returns Error/true/false
 */
const consecutiveInsert = (connection, tableName, queryParams) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!connection)
        return reject(
          "Connection not found inside consecutiveInsert function."
        );
      const query = `INSERT INTO ${tableName} SET ?`;
      // Use the connection
      const queryStats = connection.query(
        query,
        queryParams,
        (error, results) => {
          // error will be an Error if one occurred during the query
          if (error) return reject(error);
          if (!results || !results.insertId) return resolve(false);
          // results will contain the results of the query
          resolve(results.insertId);
        }
      );
      utils.captureInfoLog(utils.stripString(queryStats.sql));
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * This function can be used to perform update only, after query connection get closed
 *
 * Sample query = `UPDATE users SET email=? WHERE userId=?`
 * Sample queryParams = [user@example.com, 1]
 *
 * @param {String} query - SQL Query to be processed
 * @param {Array} queryParams - Array of query parameters including where values
 * @returns {Promise<boolean>} - returns Boolean else throws Error
 */
const simpleUpdate = (query, queryParams) => {
  return new Promise(async (resolve, reject) => {
    try {
      const connection = await getConnection();
      if (!connection) return reject("Connection not found");
      // Use the connection
      const queryStats = connection.query(
        query,
        queryParams,
        (error, results) => {
          // When done with the connection, release it.
          releaseConnection(connection);
          // error will be an Error if one occurred during the query
          if (error) return reject(error);
          if (!results || results.affectedRows == 0) return resolve(false);
          // results will contain the results of the query
          resolve(true);
        }
      );
      utils.captureInfoLog(utils.stripString(queryStats.sql));
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * This function can be used to perform update only, after query connection get closed
 *
 * Sample query = `UPDATE users SET email=? WHERE userId=?`
 * Sample queryParams = [user@example.com, 1]
 *
 * @param {String} query - SQL Query to be processed
 * @param {Array} queryParams - Array of query parameters including where values
 * @returns {Promise<boolean>} - returns Boolean else throws Error
 */
const consecutiveUpdate = (connection, query, queryParams) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!connection)
        return reject(
          "Connection not found inside consecutiveUpdate function."
        );
      // Use the connection
      const queryStats = connection.query(
        query,
        queryParams,
        (error, results) => {
          // error will be an Error if one occurred during the query
          if (error) return reject(error);
          if (!results || results.affectedRows == 0) return resolve(false);
          // results will contain the results of the query
          resolve(true);
        }
      );
      utils.captureInfoLog(utils.stripString(queryStats.sql));
    } catch (error) {
      return reject(error);
    }
  });
};

const simpleDelete = (query, queryParams) => {
  return new Promise(async (resolve, reject) => {
    try {
      const connection = await getConnection();
      if (!connection) return reject("Connection not found");
      // Use the connection
      const queryStats = connection.query(
        query,
        queryParams,
        (error, results) => {
          // When done with the connection, release it.
          releaseConnection(connection);
          // error will be an Error if one occurred during the query
          if (error) return reject(error);
          if (!results || results.affectedRows == 0) return resolve(false);
          // results will contain the results of the query
          resolve(true);
        }
      );
      utils.captureInfoLog(utils.stripString(queryStats.sql));
    } catch (error) {
      return reject(error);
    }
  });
};
module.exports = {
  getPool,
  getConnection,
  rollBack,
  beginTransaction,
  commit,
  simpleSelect,
  consecutiveSelect,
  simpleInsert,
  consecutiveInsert,
  simpleUpdate,
  consecutiveUpdate,
  simpleDelete,
};
