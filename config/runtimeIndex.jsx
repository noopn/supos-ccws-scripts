import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom";
import "antd/dist/antd.css";
import App from "./App";

ReactDOM.render(<App />, document.getElementById("root"));

const port = localStorage.getItem("__koa_server_port__") || "9348";
const wsId = localStorage.getItem("__dev_ws_id__");
const socket = io(`ws://127.0.0.1:${port}`);

socket.on("connect", () => {
  console.log("Connect ccws socket server success!");

  socket.emit("message", wsId);
});
