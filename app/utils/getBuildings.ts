import axios from "axios";
import { Building } from "../types";
export async function getBuildings(): Promise<Building[]> {
  return axios
    .get("/api/auth/building")
    .then((response) => response.data || []);
}
