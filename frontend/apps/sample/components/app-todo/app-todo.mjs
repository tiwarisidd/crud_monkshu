/*
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import { monkshu_component } from "/framework/js/monkshu_component.mjs";
import { apimanager as apiman } from "/framework/js/apimanager.mjs";

async function renderTodos() {
  let todos = await fetchTodos();
  if (todos && todos.length > 0) {
    todos.forEach(r => {
      renderOneTodo(r);
    });
  }
}

function renderOneTodo(obj) {
  let todosDiv = app_todo.shadowRoot.querySelector("#todos");
  todosDiv.style.width = "50%";
  todosDiv.appendChild(createNewTodo(obj));
}

async function markComplete(id) {
  return await apiman.rest(
    APP_CONSTANTS.API_TODO,
    "POST",
    JSON.stringify({
      op: "SUP",
      id: id,
    }),
    false,
    true
  );
}

async function markDelete(id) {
  return await apiman.rest(
    APP_CONSTANTS.API_TODO,
    "POST",
    JSON.stringify({ op: "DEL", id: id }),
    false,
    true
  );
}

async function fetchTodos() {
  return await apiman.rest(
    APP_CONSTANTS.API_TODO,
    "POST",
    JSON.stringify({ op: "GET" }),
    false,
    true
  );
}

async function addTodo(name) {
  return await apiman.rest(
    APP_CONSTANTS.API_TODO,
    "POST",
    JSON.stringify({
      op: "ADD",
      name: name,
    }),
    false,
    true
  );
}

async function onFormSubmit(e) {
  e.preventDefault();
  let res = await addTodo(e.target.querySelector("#todo-input").value);
  if (res["msg"] == "ADDED") {
    renderOneTodo(res["todo"]);
  }
  app_todo.shadowRoot.querySelector("#todo-form").reset();
}

function createNewTodo(obj) {
  const div = document.createElement("div");

  const actionDiv = document.createElement("div");

  let completeBtn = document.createElement("button");
  let deleteBtn = document.createElement("button");

  deleteBtn.innerText = "❌";
  completeBtn.innerText = "✔";

  deleteBtn.style.marginRight = "10px";
  deleteBtn.addEventListener("click", async () => {
    let res = await markDelete(obj["id"]);
    if (res["msg"] == "DELETED") {
      div.remove();
    }
  });
  completeBtn.addEventListener("click", async () => {
    let res = await markComplete(obj["id"]);
    if (res["msg"] == "UPDATED") {
      div.replaceWith(createNewTodo(res["todo"]));
    }
  });
  if (obj["status"] == 1) {
    completeBtn.disabled = true;
  }
  actionDiv.appendChild(deleteBtn);
  actionDiv.appendChild(completeBtn);

  let p = document.createElement("p");
  p.innerText = obj.name;
  if (obj["status"] == 1) {
    p.style.textDecoration = "line-through";
  }
  div.appendChild(p);
  div.appendChild(actionDiv);
  div.style.display = "flex";
  div.style.justifyContent = "space-between";
  div.style.alignItems = "center";
  return div;
}

function register() {
  // convert this all into a WebComponent so we can use it
  monkshu_component.register(
    "app-todo",
    `${APP_CONSTANTS.APP_PATH}/components/app-todo/app-todo.html`,
    app_todo
  );
}
const trueWebComponentMode = true;
// making this false renders the component without using Shadow DOM
export const app_todo = {
  trueWebComponentMode,
  register,
  renderTodos,
  onFormSubmit,
};
