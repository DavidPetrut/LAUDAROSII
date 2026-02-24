const express = require("express");
const { Course, User } = require("../models");
const { authMiddleware, isAdmin } = require("../middleware");
const { cleanupCourseData } = require("../services/cleanupService");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};

    const courses = await Course.find(filter)
      .populate("postedBy", "personalData.fullName")
      .sort({ postedAt: -1 });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: "Eroare la încarcarea cursurilor" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "postedBy",
      "personalData.fullName"
    );

    if (!course) {
      return res.status(404).json({ error: "Curs negasit" });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: "Eroare server" });
  }
});

router.post("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnailUrl, category, duration } =
      req.body;

    if (!title || !videoUrl) {
      return res
        .status(400)
        .json({ error: "Titlul și URL-ul video sunt obligatorii" });
    }

    const course = new Course({
      title,
      description,
      videoUrl,
      thumbnailUrl,
      category,
      duration,
      postedBy: req.user.id,
    });

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: "Eroare la adaugarea cursului" });
  }
});

router.put("/progress/:courseId", authMiddleware, async (req, res) => {
  try {
    const { completed } = req.body;
    const courseId = req.params.courseId;

    const courseExists = await Course.findById(courseId);
    if (!courseExists) {
      return res.status(404).json({ error: "Cursul nu mai exista" });
    }

    const user = await User.findById(req.user.id);
    const progressIndex = user.content.coursesProgress.findIndex(
      (p) => p.courseId?.toString() === courseId
    );

    if (progressIndex === -1) {
      user.content.coursesProgress.push({
        courseId,
        completed,
        completedAt: completed ? new Date() : null,
      });
    } else {
      user.content.coursesProgress[progressIndex].completed = completed;
      if (completed) {
        user.content.coursesProgress[progressIndex].completedAt = new Date();
      }
    }

    await user.save();
    res.json({ message: "Progres actualizat" });
  } catch (error) {
    res.status(500).json({ error: "Eroare la actualizarea progresului" });
  }
});

router.put("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnailUrl, category, duration } =
      req.body;

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { title, description, videoUrl, thumbnailUrl, category, duration },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ error: "Curs negasit" });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: "Eroare la actualizare" });
  }
});

router.delete("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: "Curs negasit" });
    }

    await cleanupCourseData(req.params.id);

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: "Curs și referințe asociate șterse" });
  } catch (error) {
    res.status(500).json({ error: "Eroare la ștergere" });
  }
});

module.exports = router;
