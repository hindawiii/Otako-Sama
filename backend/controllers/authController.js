import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;
const TOKEN_TTL = "7d";

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return jwt.sign({ sub: user._id.toString(), role: user.role }, secret, {
    expiresIn: TOKEN_TTL,
  });
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    country: user.country,
    preferredLanguage: user.preferredLanguage,
    role: user.role,
    xp: user.xp,
    level: user.level,
    createdAt: user.createdAt,
  };
}

export async function register(req, res) {
  try {
    const { username, email, password, preferredLanguage } = req.body ?? {};

    if (!username || !USERNAME_RE.test(String(username))) {
      return res
        .status(400)
        .json({ error: "Username must be 3–24 chars: letters, numbers, . _ -" });
    }
    if (!email || !EMAIL_RE.test(String(email))) {
      return res.status(400).json({ error: "Valid email required" });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const emailNorm = String(email).toLowerCase().trim();
    const usernameTrim = String(username).trim();

    const exists = await User.findOne({
      $or: [{ email: emailNorm }, { username: usernameTrim }],
    }).lean();
    if (exists) {
      return res.status(409).json({ error: "Username or email already in use" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      username: usernameTrim,
      email: emailNorm,
      passwordHash,
      preferredLanguage: preferredLanguage === "en" ? "en" : "ar",
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("[auth.register]", err);
    return res.status(500).json({ error: "Registration failed" });
  }
}

export async function login(req, res) {
  try {
    const { identifier, password } = req.body ?? {};
    if (!identifier || !password) {
      return res.status(400).json({ error: "identifier and password required" });
    }

    const id = String(identifier).trim();
    const query = EMAIL_RE.test(id) ? { email: id.toLowerCase() } : { username: id };
    const user = await User.findOne(query);

    // Generic message so we don't leak which field failed.
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("[auth.login]", err);
    return res.status(500).json({ error: "Login failed" });
  }
}

export async function me(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("[auth.me]", err);
    return res.status(500).json({ error: "Failed to load user" });
  }
}
