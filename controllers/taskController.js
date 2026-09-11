const mongoose = require("mongoose");
const Task = require("../models/Task");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const allowedStatuses = ["pending", "in-progress", "completed"];
const allowedPriorities = ["low", "medium", "high"];

function taskPayload(body) {
  return {
    title: body.title?.trim(),
    description: body.description?.trim(),
    assignedTo: body.assignedTo?.trim(),
    priority: body.priority,
    status: body.status,
    dueDate: body.dueDate,
  };
}

async function createTask(req, res) {
  try {
    const payload = taskPayload(req.body);

    if (!payload.title || !payload.description || !payload.assignedTo || !payload.dueDate) {
      return res.status(400).json({
        success: false,
        message: "Title, description, assignedTo and dueDate are required",
      });
    }

    if (!allowedStatuses.includes(payload.status) || !allowedPriorities.includes(payload.priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status or priority",
      });
    }

    const task = await Task.create({ ...payload, user: req.user });

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getTasks(req, res) {
  try {
    const { search, status, priority } = req.query;
    const filter = { user: req.user };

    if (search?.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
        { assignedTo: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (status && allowedStatuses.includes(status)) filter.status = status;
    if (priority && allowedPriorities.includes(priority)) filter.priority = priority;

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getTask(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }

    const task = await Task.findOne({ _id: req.params.id, user: req.user });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateTask(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }

    const payload = taskPayload(req.body);

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      payload,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({
      success: true,
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteTask(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }

    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
};
