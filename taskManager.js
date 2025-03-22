class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    }

    saveTasks() {
        localStorage.setItem("tasks", JSON.stringify(this.tasks));
    }

    addTask(title, description, priority) {
        if (!title.trim()) {
            console.error("Task Title Cannot be Empty");
            return;
        }

        const newTask = {
            id: Date.now(),
            title,
            description,
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(newTask);
        this.saveTasks();
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
    }

    updateTask(taskId, updates) {
        this.tasks = this.tasks.map(task => 
            task.id === taskId ? { ...task, ...updates } : task
        );
        this.saveTasks();
    }

    toggleTaskCompletion(taskId) {
        this.tasks = this.tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        this.saveTasks();
    }

    filterTasks(status) {
        return this.tasks.filter(task => 
            status === "all" ? true : task.completed === (status === "completed")
        );
    }

    sortTasks(by) {
        if (by === "priority") {
            this.tasks.sort((a, b) => a.priority.localeCompare(b.priority));
        } else if (by === "date") {
            this.tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        this.saveTasks();
    }

    searchTasks(query) {
        return this.tasks.filter(task =>
            task.title.toLowerCase().includes(query.toLowerCase())
        );
    }
}

const taskManager = new TaskManager();
export default taskManager;