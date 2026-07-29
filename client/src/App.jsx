import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login/Login.jsx";
import "./App.css";
import Register from "./pages/Register/Register.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route
        path="/forgot-password"
        element={<div>Forgot password page will be added here.</div>}
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;