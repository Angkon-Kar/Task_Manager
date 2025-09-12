class TaskManager {
    constructor(storageKey = "tasks_v2") {
        this.storageKey = storageKey;
        this.tasks = JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

    saveTasks() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.tasks));
    }

    _normalizeDue(due) {
        // Accept empty string or null as no due date
        return due ? due : "";
    }

    addTask({ title, description = "", priority = "low", dueDate = "", category = "", recurrence = "none" }) {
        if (!title || !title.trim()) {
            throw new Error("Task title required");
        }
        const newTask = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            title: title.trim(),
            description: description.trim(),
            priority,
            completed: false,
            dueDate: this._normalizeDue(dueDate),
            category: category || "",
            recurrence: recurrence || "none", // none | daily | weekly | monthly
            createdAt: new Date().toISOString()
        };
        this.tasks.push(newTask);
        this.saveTasks();
        return newTask;
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveTasks();
    }

    updateTask(taskId, updates = {}) {
        this.tasks = this.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
        this.saveTasks();
    }

    toggleTaskCompletion(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        task.completed = !task.completed;
        // If task becomes completed and it's recurring, schedule next occurrence
        if (task.completed && task.recurrence && task.recurrence !== "none") {
            const nextDue = TaskManager._getNextDueDate(task.dueDate, task.recurrence);
            if (nextDue) {
                // create a new task for next recurrence (copy of current but not completed)
                this.addTask({
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    dueDate: nextDue,
                    category: task.category,
                    recurrence: task.recurrence
                });
            }
        }
        this.saveTasks();
    }

    filterTasks(status = "all") {
        if (status === "all") return [...this.tasks];
        if (status === "completed") return this.tasks.filter(t => t.completed);
        return this.tasks.filter(t => !t.completed);
    }

    searchTasks(query = "") {
        const q = (query || "").toLowerCase();
        if (!q) return [...this.tasks];
        return this.tasks.filter(t =>
            (t.title || "").toLowerCase().includes(q) ||
            (t.description || "").toLowerCase().includes(q)
        );
    }

    sortTasks(by = "date") {
        // Sorting mutates tasks array (so UI order persists)
        if (by === "priority") {
            const order = { high: 1, medium: 2, low: 3 };
            this.tasks.sort((a, b) => (order[a.priority] || 99) - (order[b.priority] || 99));
        } else if (by === "date") {
            // tasks with no due date go last
            this.tasks.sort((a, b) => {
                const A = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const B = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return A - B;
            });
        } else if (by === "created") {
            this.tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        this.saveTasks();
    }

    bulkUpdate(ids = [], updates = {}) {
        this.tasks = this.tasks.map(t => ids.includes(t.id) ? { ...t, ...updates } : t);
        this.saveTasks();
    }

    bulkDelete(ids = []) {
        this.tasks = this.tasks.filter(t => !ids.includes(t.id));
        this.saveTasks();
    }

    exportTasks() {
        return JSON.stringify(this.tasks, null, 2);
    }

    importTasks(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (!Array.isArray(imported)) throw new Error("Invalid file");
            // ensure unique IDs - if duplicates, give new id
            const existingIds = new Set(this.tasks.map(t => t.id));
            imported.forEach(t => {
                if (!t.id || existingIds.has(t.id)) {
                    t.id = Date.now() + Math.floor(Math.random() * 1000);
                }
                this.tasks.push(t);
            });
            this.saveTasks();
            return true;
        } catch (err) {
            console.error("Import failed", err);
            return false;
        }
    }

    static _getNextDueDate(currentDue, recurrence) {
        // If no current due date, skip recurrence creation
        if (!currentDue) return "";
        const d = new Date(currentDue + "T00:00:00");
        if (isNaN(d)) return "";
        if (recurrence === "daily") d.setDate(d.getDate() + 1);
        else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
        else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
}

// expose for script
window.TaskManager = TaskManager;
