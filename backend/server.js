import express from "express";
import dotenv from "dotenv";
import authRoutes from "./Routes/auth.routes.js";
import msgRoutes from "./Routes/message.routes.js";
import connectToMongoDb from "./DB/connectToDB.js";



const app = express();

dotenv.config();
const PORT = process.env.PORT || 5550;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello Valery, te amo culiada");
});

app.use("/api/auth", authRoutes);
app.use("/api/msg", msgRoutes);

// Wrap in async function to wait for DB
const startServer = async () => {
    try {
        await connectToMongoDb(); // Make sure this function returns a Promise
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("❌ Failed to connect to MongoDB:", err);
        process.exit(1); // Exit the app if DB connection fails
    }
};

startServer();
