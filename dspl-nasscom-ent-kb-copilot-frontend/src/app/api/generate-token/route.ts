import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET; // for signing token
const TARGET_AUDIENCE = process.env.TARGET_AUDIENCE;

export async function GET(req: NextRequest) {
    try {
        // 1. Read JWT access token from cookies
        const accessToken = req.cookies.get("token")?.value;
        if (!accessToken) {
            return NextResponse.json({ error: "No token found in cookies" }, { status: 401 });
        }

        // 2. Decode access token to extract email + user id
        const decoded: any = jwt.decode(accessToken);
        const email = decoded?.email;
        const userId = decoded?.sub || decoded?.user_id || email;

        if (!email) {
            return NextResponse.json({ error: "Email missing in token" }, { status: 400 });
        }

        // 3. Generate custom JWT with 3 min expiry
        const token = jwt.sign(
            {
                sub: userId,
                email: email,
                aud: TARGET_AUDIENCE,
            },
            JWT_SECRET,
            { expiresIn: "2m" }
        );

        return NextResponse.json({
            token: token             
        });

    } catch (err) {
        console.error("Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
