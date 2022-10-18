
class SnakeGame {

    static NUM_ROWS = 15;
    static NUM_COLS = 30;

    boardCells = [];
    score = 0;

    constructor(board, controls) {

        this.board = board;
        this.controls = controls;

        this.scoreCounter = this.controls.querySelector('.score');

        this.initBoard();

        this.food = new Food(this);
        this.snake = new Snake(this);
        this.scoreboard = new ScoreBoard(this);

        window.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'ArrowLeft':
                case 'a':
                    this.snake.setDirection('left');
                    break;

                case 'ArrowUp':
                case 'w':
                    this.snake.setDirection('up');
                    break;

                case 'ArrowRight':
                case 'd':
                    this.snake.setDirection('right');
                    break;

                case 'ArrowDown':
                case 's':
                    this.snake.setDirection('down');
                    break;

                case 'Escape':
                    this.snake.pause();
                    break;
            }
        });

    }

    /**
     * Build the board using rows of cells
     */
    initBoard() {

        // Generate a new row
        const newRow = (rowNum) => {
            const row = document.createElement('div');
            row.classList.add('row');
            row.classList.add('row-' + rowNum);
            return row;
        }
        // Generate a new column
        const newCol = (colNum) => {
            const col = document.createElement('div');
            col.classList.add('col');
            col.classList.add('col-' + colNum);
            return col;
        }

        // For each number of rows make a new row element and fill with columns
        for (let r = 0; r < SnakeGame.NUM_ROWS; r++) {

            const row = newRow(r);
            const boardCellsRow = [];

            // For each number of columns make a new column element and add to the row
            for (let c = 0; c < SnakeGame.NUM_COLS; c++) {

                const col = newCol(c);
                row.appendChild(col);
                boardCellsRow.push(col);

            }

            this.board.appendChild(row);
            this.boardCells.push(boardCellsRow);

       }

    }

    /**
     * Begin the game
     */
    play() {

        this.controls.classList.add('playing');

        this.food.add();
        this.snake.move();

    }

    /**
     * Restart the game after game over
     */
    restart() {

        this.snake.reset();
        this.resetScore();
        this.controls.classList.remove('game-over');
        this.board.classList.remove('game-over');
        this.scoreboard.deleteScoreTable();
        this.board.classList.remove('scoreBoard');
        this.play();

    }

    /**
     * Increment the user's score
     */
    increaseScore(amount) {

        this.score += amount;
        this.scoreCounter.innerText = this.score;

    }

    // Reset the score to 0
    resetScore() {

        this.score = 0;
        this.scoreCounter.innerText = this.score;

    }

    /**
     * End the game
     */
    async gameOver() {

        this.snake.pause();

        this.controls.classList.remove('playing');
        this.controls.classList.add('game-over');
        this.board.classList.add('game-over');

        const playerName = window.prompt(`You scored ${this.score} – What's your name? Submit your score!`);

        if (playerName !== null){

            this.scoreboard.submitScore(playerName)
        }

    }

}

class ScoreBoard {

    constructor(game) {

        this.game = game;

    }

    // API call to GET high score board, only displays top 5 player scores
    async getScores() {

        this.game.board.classList.remove('game-over');
        this.game.controls.classList.remove('playing');
        this.game.board.classList.add('scoreBoard')

        const apiUrl = '';

        const res = await fetch(apiUrl);

        if (res.ok) {

            const data = await res.json();
            this.createScoreTable(data);

        } else {
            return `HTTP error: ${res.status}`;
        }

    }

    createScoreTable(data) {

        // Sort players by scores descending order
        const sortedData = (data.sort(function(a, b){
            return b.score - a.score;
        }));

        const topPlayers = []

        // Set top 5 players
        for (let i = 0; i<5; i++){
            topPlayers.push(sortedData[i]);
        }

        // Generate html element to render scoard board
        let tableDiv = document.getElementById("render-score-board");
        let table  = document.createElement('table');
        table.setAttribute('id', 'table');

        for (let i = 0; i < topPlayers.length; i++) {

            let tr = table.insertRow();
            let td_name = tr.insertCell();

            let playerName = topPlayers[i]['name'];
            let playerScore = topPlayers[i]['score'];

            td_name.appendChild(document.createTextNode(playerName));

            let td_score = tr.insertCell();
            td_score.appendChild(document.createTextNode(playerScore));

        }

        table.classList.add('scoreBoardTable');
        tableDiv.appendChild(table);

    }

    deleteScoreTable() {

        const tableElem = document.getElementById("table");

        if (document.body.contains(tableElem)) {
            tableElem.remove();
        } else {
            return;
        }

    }

    // Score is submitted only when user enters player name and presses ok button in the window prompt
    async submitScore(playerName) {

        const apiUrl = '';
        const data = { "name": playerName, "score": this.game.score }

        let res = await fetch(apiUrl, {

            method: 'POST',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify(data)

        });

        if (res.ok) {
            console.log(res);
        } else {
            return `HTTP error: ${res.status}`;
          }

    }

}

class Snake {

    static STARTING_EDGE_OFFSET = 20;

    tail = [];
    tailLength = 3;
    direction = 'up';
    speed = 800;
    moving = false;
    xCurrentVelocity = 0; // Stores current state of xVelocity (velocity increments or decrements position of a coordinate by 1)
    yCurrentVelocity = 0;
    xUpdateVelocity = 0;  // Stores state of requested change in velocity
    yUpdateVelocity = 0;

    constructor(game) {

        this.game = game;

        this.init();

    }

    /**
     * Place the snake initially
     */
    init() {

        const x = Math.floor(Math.random() * (SnakeGame.NUM_COLS - Snake.STARTING_EDGE_OFFSET)) + (Snake.STARTING_EDGE_OFFSET / 2);
        const y = Math.floor(Math.random() * (SnakeGame.NUM_ROWS - Snake.STARTING_EDGE_OFFSET)) + (Snake.STARTING_EDGE_OFFSET / 2);
        this.position = { "x": x, "y": y };

        const startCell = this.game.boardCells[y][x];
        startCell.classList.add('snake');

        this.tail.push([this.position, startCell]);

    }

    /**
     * Move the snake
     */
    move() {

        // If this is the first move, make sure the game isn't paused
        if (!this.moving) {
            this.moving = true;
            this.game.controls.classList.remove('paused');
        }

        // Fetches coordinates of food
        const foodX = this.game.food.position.x;
        const foodY = this.game.food.position.y;

        // Update snake's direction to ensure snake is moving
        this.setDirection(this.direction);

        // Update current state of x & y velocity
        this.xCurrentVelocity = this.xUpdateVelocity;
        this.yCurrentVelocity = this.yUpdateVelocity;

        // Update snake's head coordinates
        const headX = this.position.x + this.xCurrentVelocity;
        const headY = this.position.y + this.yCurrentVelocity;
        this.position = { "x": headX, "y": headY };

        // Hits a Wall
        if (this.position.x >= SnakeGame.NUM_COLS || this.position.y >= SnakeGame.NUM_ROWS ||
            this.position.x < 0 || this.position.y < 0) {

                this.game.gameOver();
                this.game.food.remove(foodX, foodY);

        }

        // Render snake's head and tail
        const head = this.game.boardCells[this.position.y][this.position.x];
        head.classList.add('snake');
        this.tail.push([this.position,head]);

        // Delete a tail part => if total parts > tail length
        if (this.tail.length > this.tailLength) {

            this.tail[0][1].classList.remove('snake');
            this.tail.shift(); // Deletes furthest tail part

        }

        // Hits Itself
        for (let i = 0; i < this.tail.length -1; i++) {

            let part = this.tail[i][0];

            if (part.x === this.position.x && part.y === this.position.y) {

                this.game.gameOver();
                this.game.food.remove(foodX, foodY);
                return;

            }

        }

        // Runs into Food
        if (this.position.x == foodX && this.position.y == foodY) {

            this.game.increaseScore(1);
            this.tailLength++;
            this.game.food.move(foodX, foodY);

        }

        // Move another step in `this.speed` number of milliseconds
        this.movementTimer = setTimeout(() => { this.move(); }, this.speed/this.tailLength);

    }

    /**
     * Set the snake's direction
     */
     setDirection(direction) {

         switch (direction) {
             case 'up':
               if (this.yCurrentVelocity == 1) return; //Prevents user from changing snake's direction by checking current state of x & y coordinates
               this.yUpdateVelocity = -1; //Decrements only y coordinate, ensuring snake moves upwards. Updates state of yUpdateVelocity
               this.xUpdateVelocity = 0;
               break;
             case 'down':
               if (this.yCurrentVelocity == -1) return;
               this.yUpdateVelocity = 1;
               this.xUpdateVelocity = 0;
               break;
             case 'left':
               if (this.xCurrentVelocity == 1) return;
               this.xUpdateVelocity = -1;
               this.yUpdateVelocity = 0;
               break;
             case 'right':
               if (this.xCurrentVelocity == -1) return;
               this.xUpdateVelocity = 1;
               this.yUpdateVelocity = 0;
               break;
             }
             this.direction = direction
     }


    /**
     * Pause the snake's movement
     */
    pause() {

        clearTimeout(this.movementTimer);
        this.moving = false;
        this.game.controls.classList.add('paused');

    }

    /**
     * Reset the snake back to the initial defaults
     */
    reset() {

        for (let i = 0; i < this.tail.length; i++) {
            this.tail[i][1].classList.remove('snake');
        }

        this.tail.length = 0;
        this.tailLength = 3;
        this.direction = 'up';
        this.moving = false;
        this.xCurrentVelocity = 0;
        this.yCurrentVelocity = 0;
        this.xUpdateVelocity = 0;
        this.yUpdateVelocity = 0;

        this.init();

    }

}

class Food {

    constructor(game) {

        this.game = game;

    }

    /**
     * Place the food randomly on the board, by adding the class 'food' to one of the cells
     */
    add() {

        const foodX = Math.floor(Math.random() * (SnakeGame.NUM_COLS - Snake.STARTING_EDGE_OFFSET)) + (Snake.STARTING_EDGE_OFFSET / 2);
        const foodY = Math.floor(Math.random() * (SnakeGame.NUM_ROWS - Snake.STARTING_EDGE_OFFSET)) + (Snake.STARTING_EDGE_OFFSET / 2);
        this.position = { "x": foodX, "y": foodY };

        const part = this.game.boardCells[foodY][foodX];
        part.classList.add('food');

      }

    remove(foodX, foodY) {

        const foodPart = this.game.boardCells[foodY][foodX];
        foodPart.classList.remove('food'); // Removes food from board

    }

    // Removes existing food and places new food randomly on the board. New food will not be placed within the snake's tail
    move(foodX, foodY) {

        this.remove(foodX, foodY);

        let counter = 0;
        let success = false;
        const snakeTail = this.game.snake.tail;

        while(success == false) {

            const foodX = Math.floor(Math.random() * (SnakeGame.NUM_COLS - Snake.STARTING_EDGE_OFFSET)) + (Snake.STARTING_EDGE_OFFSET / 2);
            const foodY = Math.floor(Math.random() * (SnakeGame.NUM_ROWS - Snake.STARTING_EDGE_OFFSET)) + (Snake.STARTING_EDGE_OFFSET / 2);

            for (let i = 0; i < snakeTail.length; i++) {

                if (snakeTail[i][0]['x'] == foodX && snakeTail[i][0]['y'] == foodY) {

                    counter = counter + 1;

                }
            }

            if ( counter == 0) {

                success = true;
                this.position = { "x": foodX, "y": foodY};
                const part = this.game.boardCells[foodY][foodX];
                part.classList.add('food');

                return;

            } else {
                  success = false;
                  counter = 0;
              }
        }
    }

}
