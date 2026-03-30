import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import App from "./App";
import Nutrition from "./pages/Nutrition";
import Strength from "./pages/Strength";
import Steps from "./pages/Steps";
import Weight from "./pages/Weight";
import Stretching from "./pages/Stretching";
import Cardio from "./pages/Cardio";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Navigate to="/nutrition" replace />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="strength" element={<Strength />} />
          <Route path="steps" element={<Steps />} />
          <Route path="weight" element={<Weight />} />
          <Route path="stretching" element={<Stretching />} />
          <Route path="cardio" element={<Cardio />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
