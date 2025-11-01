class TaskManager {
    constructor(storageKey = "tasks_v2") {
        this.storageKey = storageKey;
        // ensure tasks array is always up-to-date from localStorage
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
            // ⭐ ID Fix: Increased random factor to avoid quick conflicts (e.g., recurrence)
            id: Date.now() + Math.floor(Math.random() * 1000000), 
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

    // ⭐ CRITICAL Recurrence Fix
    toggleTaskCompletion(taskId) {
        let task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const isCompleting = !task.completed;
        
        task.completed = isCompleting;

        if (isCompleting && task.recurrence !== 'none') {
            const nextDue = TaskManager._getNextDueDate(task.dueDate, task.recurrence);
            
            // 1. If next due date is valid, create a new recurring task instance
            if (nextDue) {
                this.addTask({
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    dueDate: nextDue,
                    category: task.category,
                    recurrence: task.recurrence
                });
            } else {
                // 2. If recurrence fails (e.g., month end issue), treat it as non-recurring and remove recurrence
                task.recurrence = 'none';
            }
            // Note: The completed task (old instance) will be hidden by script.js render logic.
        } else if (!isCompleting && task.recurrence !== 'none') {
             // If undoing completion on a recurring task, and a new instance exists, delete the new instance
             // This is a complex undo, often better handled by deleting the new instance (simplified for this context)
             // For simplicity, we just mark the old one incomplete.
        }

        this.saveTasks();
    }

    filterTasks(filter) {
        if (filter === "completed") return this.tasks.filter(t => t.completed);
        if (filter === "incomplete") return this.tasks.filter(t => !t.completed);
        return this.tasks;
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
        } else if (by === "custom") { 
            // Do nothing; maintain the existing order set by drag and drop
        }
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
                    // ⭐ ID Fix
                    t.id = Date.now() + Math.floor(Math.random() * 1000000); 
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
        
        // Format back to YYYY-MM-DD
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}