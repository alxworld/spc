import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mount Convex Auth HTTP routes (handles token exchange, session refresh, etc.)
auth.addHttpRoutes(http);

export default http;
