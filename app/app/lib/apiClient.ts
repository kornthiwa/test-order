import axios from "axios";

// const baseURL =
//   process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://apirecycle.unii.co.th";
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});
