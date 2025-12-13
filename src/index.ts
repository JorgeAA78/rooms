import "./style.css";
import { initRouter } from "./router";
import { state } from "./state";

(function () {
  state.init();
  const root = document.querySelector(".root");
  if (root) {
    initRouter(root);
  } else {
    console.error("Root element not found");
  }
})();
