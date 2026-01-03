import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'  // <--- ACEASTĂ LINIE ESTE OBLIGATORIE!
if (typeof window !== "undefined" && typeof window.SyncedNavigator === "undefined") {
  window.SyncedNavigator = window.navigator;
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)