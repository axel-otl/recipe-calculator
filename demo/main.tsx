import "leaflet/dist/leaflet.css";
import { createRoot } from "react-dom/client";
import App from "@/components/App";
import { installMockApi } from "./mockApi";

installMockApi();
createRoot(document.getElementById("root")!).render(<App />);
