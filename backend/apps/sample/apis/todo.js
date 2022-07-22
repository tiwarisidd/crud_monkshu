/*
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */
// Custom modules
const API_CONSTANTS = require(`${CONSTANTS.APPROOTDIR}/sample/apis/lib/constants`);
const db = require(`${CONSTANTS.APPROOTDIR}/sample/db/db`);

exports.doService = async jsonReq => {
  if (!validateRequest(jsonReq)) return API_CONSTANTS.API_INSUFFICIENT_PARAMS;
  try {
    const message = await handleOp(jsonReq);
    return message;
  } catch (error) {
    console.error(error);
    return API_CONSTANTS.API_RESPONSE_SERVER_ERROR;
  }
};

const handleOp = async jsonReq => {
  // jsonReq = JSON.parse(jsonReq.toString("utf8"));
  if (jsonReq["op"] == "GET") {
    return db.simpleSelect("SELECT * FROM todos;", []);
  }
  if (jsonReq["op"] == "ADD") {
    let added = await db.simpleInsert("todos", [{ name: jsonReq["name"] }]);
    let newTodo = await db.simpleSelect("SELECT * FROM todos WHERE id = ?;", [
      added,
    ]);
    return newTodo ? { msg: "ADDED", todo: newTodo[0] } : { msg: "NOT_ADDED" };
  }
  if (jsonReq["op"] == "DEL") {
    let updated = await db.simpleDelete("DELETE FROM todos WHERE id = ?", [
      jsonReq["id"],
    ]);
    return updated ? { msg: "DELETED" } : { msg: "NOT_DELETED" };
  }
  if (jsonReq["op"] == "SUP") {
    let updated = await db.simpleUpdate(
      "UPDATE todos SET status = ? WHERE id = ?",
      [1, jsonReq["id"]]
    );
    let newTodo = await db.simpleSelect("SELECT * FROM todos WHERE id = ?;", [
      jsonReq["id"],
    ]);
    return updated
      ? {
          msg: "UPDATED",
          todo: newTodo[0],
        }
      : { msg: "NOT_UPDATED" };
  }
};

const validateRequest = jsonReq => {
  // jsonReq = JSON.parse(jsonReq.toString("utf8"));
  if (jsonReq["op"]) {
    if (jsonReq["op"] == "GET") {
      return true;
    }
    if (jsonReq["op"] == "ADD" && jsonReq["name"]) {
      return true;
    }
    if (jsonReq["op"] == "DEL" && jsonReq["id"]) {
      return true;
    }
    if (jsonReq["op"] == "SUP" && jsonReq["id"]) {
      return true;
    }
  }
  return false;
};
