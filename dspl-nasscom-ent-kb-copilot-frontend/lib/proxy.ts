import { NextRequest, NextResponse } from 'next/server';

export async function handleProxy(req: NextRequest, path: string[]) {
  const backendUrl = process.env.COPILOT_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json({ error: 'COPILOT_BACKEND_URL is not defined' }, { status: 500 });
  }

  const url = `${backendUrl}/api/v1/${path.join("/")}${req.url.includes("?") ? "?" + req.url.split("?")[1] : ""}`;
  const token = req.cookies.get("token")?.value;

  try {
    const contentType = req.headers.get("content-type") || "";
    let backendBody: BodyInit | undefined = undefined;

    // If request contains FormData (file upload), read as ArrayBuffer
    if (contentType.includes("multipart/form-data")) {
      console.log("multipart/form-data");
      const arrayBuffer = await req.arrayBuffer();
      backendBody = arrayBuffer; // forward raw body
    }
    //If JSON, parse normally
    else if (contentType.includes("application/json")) {
      console.log("application/json");
      const jsonBody = await req.json().catch(() => undefined);
      backendBody = jsonBody ? JSON.stringify(jsonBody) : undefined;
    }

    // Clone headers to pass through (excluding host)
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "host") headersObj[key] = value;
    });

    // Always override Authorization header, keep others
    headersObj["Authorization"] = `Bearer ${token ?? ""}`;

    // Make backend request
    const response = await fetch(url, {
      method: req.method,
      headers: headersObj,
      body: ["GET", "HEAD"].includes(req.method ?? "") ? undefined : backendBody,
    });

    // Handle non-JSON responses (e.g. file responses)
    const responseText = await response.text().catch(() => "");
    const responseData = (() => {
      try { return JSON.parse(responseText); } catch { return responseText; }
    })();

    return NextResponse.json(responseData, { status: response.status });

  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
