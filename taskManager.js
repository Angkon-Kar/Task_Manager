class TaskManager {
    constructor() {
        // Load tasks from localStorage or initialize an empty array
        this.tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    }

    // Save tasks to localStorage
    saveTasks() {
        localStorage.setItem("tasks", JSON.stringify(this.tasks));
    }

    // Add a new task
    addTask(title, description, priority, dueDate = null) {
        if (!title.trim()) {
            console.error("Task title cannot be empty");
            return;
        }

        const newTask = {
            id: Date.now(), // Unique ID based on timestamp
            title,
            description,
            priority,
            completed: false,
            dueDate: dueDate || "No due date",
            createdAt: new Date().toISOString()
        };

        this.tasks.push(newTask);
        this.saveTasks(); // Save updated task list
    }

    // Delete a task by ID
    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
    }

    // Update a task by ID
    updateTask(taskId, updates) {
        this.tasks = this.tasks.map(task => 
            task.id === taskId ? { ...task, ...updates } : task
        );
        this.saveTasks();
    }

    // Toggle task completion status
    toggleTaskCompletion(taskId) {
        this.tasks = this.tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        this.saveTasks();
    }

    // Filter tasks by status (all, completed, incomplete)
    filterTasks(status) {
        return this.tasks.filter(task => 
            status === "all" ? true : task.completed === (status === "completed")
        );
    }

    // Sort tasks by priority or date
    sortTasks(by) {
        if (by === "priority") {
            this.tasks.sort((a, b) => a.priority.localeCompare(b.priority));
        } else if (by === "date") {
            this.tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        this.saveTasks();
    }

    // Search tasks by title
    searchTasks(query) {
        return this.tasks.filter(task =>
            task.title.toLowerCase().includes(query.toLowerCase())
        );
    }
}

// Create an instance of TaskManager
const taskManager = new TaskManager();
