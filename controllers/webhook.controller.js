import { Webhook } from "svix";
import User from "../models/user.model.js";

export const clerkWebHook = async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Webhook secret is needed!");
  }

  const payload = req.body;
  const headers = req.headers;

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;
  try {
    evt = wh.verify(payload, headers);
  } catch (error) {
    console.log("Something went wrong! " + error);
    return res.status(400).json({
      message: "Webhook verification failed!",
    });
  }

  if (evt.type === "user.created") {
    const clerkId = evt.data.id;

    //check if cler id is available
    if (!clerkId) {
      console.error("Missing Clerk ID in event data.");
      return res
        .status(400)
        .json({ message: "Invalid Clerk user data: Clerk ID is null." });
    }

    try {
      //check if there's already a user with the same clerkUserId
      const existingUser = await User.findOne({ clerkUserId: clerkId });
      if (existingUser) {
        console.log("User already exists:", existingUser);
        return res.status(200).json({ message: "User already exists." });
      }

      //create a new user
      const newUser = new User({
        clerkUserId: clerkId,
        username:
          evt.data.username ||
          evt.data.email_addresses[0]?.email_address ||
          "Unknown",
        email:
          evt.data.email_addresses[0]?.email_address || "No email provided",
        img: evt.data.profile_image_url || "",
      });

      //save user
      const user = await newUser.save();
      console.log("New user saved:", user);

      return res
        .status(200)
        .json({ message: "User created and saved to the database" });
    } catch (error) {
      console.error("Error saving new user:", error);
      
      return res.status(500).json({
        message: "Error saving user to the database",
      });
    }
  }
  return res.status(200).json({
    message: "Webhook received",
  });
};
