class TaskManager{
    constructor(){
        this.tasks = JSON(localStorage.getItem("tasks")) || [];
    }

    saveTasks(){
        localStorage.setItem("tasks", JSON.stringify(this.tasks));
    }

    addTask(title, description, priority){
        if(!title.trim()){
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

    deleteTask(taskID) {
        this.tasks = this.tasks.filter(task => task.id !== taskID);
        this.saveTasks();
    }

    updateTask(taskId, updates) {
        this.tasks = this.tasks.map(task => task.id === taskID ?
            { ...task, ...updates} : task
        );
        this.saveTasks();
    }

    toggleTaskCompletion(taskID){
        this.tasks = this.tasks.map(task =>
            task.it === taskID ? {...task, completed: !task.completed} : task
        );
        this.saveTasks();
    }

    filterTasks(status){
        return this.tasks.filter(task => 
            status === "all" ? true : completed === (status === "completed")
        );
    }

    sortTasks(by){
        if(by === "priority"){
            this.tasks.sort((a,b) => a.priority.localCompare(b.priority));
        }
        else if (by === "date"){
            this.tasks.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        this.saveTasks();
    }

    searchTasks(query){
        return this.tasks.filter(task =>
            task.title.toLowercase().includes(query.toLowercase())
        );
    }

}

const taskManager = new TaskManager();
export default taskManager;