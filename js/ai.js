function AI(grid) {
  this.grid = grid;
  // Default search algoritma
  this.algorithm = "expectimax";
  this.depthlimit = 3;
}

AI.prototype.getBestMove = function() {
  //filter algoritma
  var move = -1;
  switch (this.algorithm) {
    case ("minimax") :
      var best = this.getMoveMinimax();
      move = best.move;
      break;
    case ("expectimax") :
      var best = this.getMoveExpectimax();
      move = best.move;
      break;
  }
  
  document.title = "score: " + best.score;
  if (move == -1 || this.grid.clone().move(move) == -1) {
    do {
      move = Math.floor((Math.random() * 4));
    }
    while (this.grid.clone().move(move) == -1);
  }
  return move;
};

// Get bestMove berdasarkan Score-perPlay
AI.prototype.getMoveMaxScore = function() {
  var bestMove = -1;
  var bestScore = 0;
  for (var direction = 0; direction < 4; direction++) {
    var dummyGrid = this.grid.clone();
    var dummyScore = dummyGrid.move(direction);
    if (dummyScore > bestScore) {
      bestMove = direction;
      bestScore = dummyScore;
    }
  }
  return bestMove;
};

// Get best move based ->pendapatan skor/move
AI.prototype.getMoveMaxScoreAfterKMoves = function(grid, k) {
  var self = this;

  if (k == 0) {
    return {
      move: -1,
      score: 0
    };
  }

  var candidates = [];
  
  for (var direction = 0; direction < 4; direction++) {
    var newGrid = grid.clone();
    var newScore = newGrid.move(direction);

    
    if (newScore == -1) {
      candidates[direction] = -1;
    }
    //ngitung expectation dr score 
    else {
      var availableCells = newGrid.availableCells();
      var nEmptyCells = availableCells.length;
      availableCells.forEach(function(cell) {
        //pilih 2 --> current cell
        var newGrid2 = newGrid.clone();
        newGrid2.insertTile(new Tile(cell, 2));
        newScore += 0.9 * (1.0 / nEmptyCells) * self.getMoveMaxScoreAfterKMoves(newGrid2, k-1).score;

        //pilih 4 --> current cell
        var newGrid4 = newGrid.clone();
        newGrid4.insertTile(new Tile(cell, 4));
        newScore += 0.1 * (1.0 / nEmptyCells) * self.getMoveMaxScoreAfterKMoves(newGrid4, k-1).score;
      });

      candidates[direction] = newScore;
    }
  }

  //ngambil bestMove
  var bestMove = {move: -1, score: 0};
  for (var direction = 0; direction < 4; direction++) {
    if (candidates[direction] > bestMove.score) {
      bestMove.score = candidates[direction];
      bestMove.move = direction;
    }
  }
  return bestMove;
};

// Algorithm Yanfa
AI.prototype.getMoveYanfaAlgorithm = function() {
  // move according to these priorities: left, down, up
  if (this.grid.clone().move(3) != -1) {
    return 3;
  }
  if (this.grid.clone().move(2) != -1) {
    return 2;
  }
  if (this.grid.clone().move(0) != -1) {
    return 0;
  }
  //if all moves above fail, we have no choice
  return 1;
};

// Heuristic for grid
AI.prototype.getHeuristic = function(grid) {
  var self = grid;
  var score = 0;
  var largest = grid.largest();
  grid.eachCell(function(x, y, cell) {
    if (!cell) {
      //add score plg besar di empty cells
      score += 4096;
    }
    else {
      //di midle penalty tambahin ubin largest value
      var distance = Math.min(Math.min(x, self.size - 1 - x), Math.min(y, self.size - 1 - y));
      score -= 10 * distance * cell.value;
      
      //add score if largest value di dlm x,y border
      if (cell.value == largest) {
        var xBorder = (x == 0 || x == self.size-1);
        var yBorder = (y == 0 || y == self.size-1);
        if (xBorder && yBorder) {
          score += 4096;
        }
        else if (xBorder || yBorder) {
          //score += 2048;
        }
      }

    }
  });

  //penalty non-smooth grid
  for (var x = 1; x < grid.size; x++) {
    for (var y = 1; y < grid.size; y++) {
      if (!!grid.cells[x][y] && !!grid.cells[x][y-1]) {
        score -= 10 * Math.abs(grid.cells[x][y].value - grid.cells[x][y-1].value);
      }

      if (!!grid.cells[x][y] && !!grid.cells[x-1][y]) {
        score -= 10 * Math.abs(grid.cells[x][y].value - grid.cells[x-1][y].value);
      }
    }
  }
  

  return score;
};

AI.prototype.getHashCode = function(grid) {
  var p = 982451653;
  var hash = 0;
  grid.eachCell(function(x, y, cell) {
    var addum = 0;
    if (!!cell) addum = cell.value;
    hash = 4096 * hash + addum;
    hash %= p;
  });
  return hash;
};

// Expectimax Algorithm
// nneonneo's algorithm
AI.prototype.getMoveExpectimax = function() {
  // clear memoization
  this.memo = [];
  return this.getMoveExpectimaxDFS(this.grid, this.depthlimit);
};

AI.prototype.findMemoization = function(grid) {
  return this.memo[this.getHashCode(grid)];
};

AI.prototype.addMemoization = function(grid, move, score) {
  var hash = this.getHashCode(grid);
  this.memo[hash] = {
    move: move,
    score: score
  };
};

AI.prototype.getMoveExpectimaxDFS = function(grid, depth) {
  if (depth == 0) {
    result = {move: -1, score: this.getHeuristic(grid)};
    this.addMemoization(grid, result.move, result.score);
    return result;
  }

  //find in memo if possible
  var memoized = this.findMemoization(grid);
  if (memoized) {
    return memoized;
  }

  var self = this;
  var candidates = [];
  
  for (var direction = 0; direction < 4; direction++) {
    var newGrid = grid.clone();
    var newScore = newGrid.move(direction);

    //if grid cannot be moved by current direction
    if (newScore == -1) {
      candidates[direction] = -999999;
    }
    //hitung skor perkiraan
    else {
      var availableCells = newGrid.availableCells();
      var nEmptyCells = availableCells.length;
      newScore = 0;
      availableCells.forEach(function(cell) {
        //add 2 to current cell
        var newGrid2 = newGrid.clone();
        newGrid2.insertTile(new Tile(cell, 2));
        newScore += 0.9 * (1.0 / nEmptyCells) * self.getMoveExpectimaxDFS(newGrid2, depth - 1).score;

        //add 4 to current cell
        var newGrid4 = newGrid.clone();
        newGrid4.insertTile(new Tile(cell, 4));
        newScore += 0.1 * (1.0 / nEmptyCells) * self.getMoveExpectimaxDFS(newGrid4, depth - 1).score;
      });

      candidates[direction] = newScore;
    }
  }

  //pilih best move
  var bestMove = {move: 0, score: candidates[0]};
  for (var direction = 1; direction < 4; direction++) {
    if (candidates[direction] > bestMove.score) {
      bestMove.score = candidates[direction];
      bestMove.move = direction;
    }
  }

  //memoization part
  this.addMemoization(grid, bestMove.move, bestMove.score);

  return bestMove;
};


// Minimax Algorithm
AI.prototype.getMoveMinimax = function() {
  var bestMove = {score: -999999, move: -1};
  // Iterative deepening
  var mindepth = Math.floor(this.depthlimit/2);
  var maxdepth = this.depthlimit;
  for (var depth = mindepth; depth <= maxdepth; depth++) {
    var temp = this.getMoveMinimaxDFS(this.grid, -999999, 999999, {player: true}, depth);
    if (temp.score > bestMove.score) {
      bestMove = temp;
    }
  }
  return bestMove;
};

// Minimax -- Alpha-Beta pruning
AI.prototype.getMoveMinimaxDFS = function(grid, alpha, beta, turn, depth) {
  if (depth == 0) {
    return {move: -1, score: this.getHeuristic(grid)};
  }

  //p turn
  if (turn.player) {
    var bestMove = {move: -1, score: alpha};
    for (var direction = 0; direction < 4; direction++) {
      var newGrid = grid.clone();
      if (newGrid.move(direction) == -1) {
        continue;
      }
      var result = this.getMoveMinimaxDFS(newGrid, alpha, beta, {computer:true}, depth-1);
      if (result.score > alpha) {
        alpha = Math.max(alpha, result.score);
        bestMove = {move: direction, score: alpha};
      }
      if (beta <= alpha) {
        break;
      }
    }
    return bestMove;
  }

  //c turn
  else if (turn.computer) {
    var terminated = false;
    for (var x = 0; x < grid.size && !terminated; x++) {
      for (var y = 0; y < grid.size && !terminated; y++) {
        if (!grid.cells[x][y]) {
          var newGrid2 = grid.clone();
          newGrid2.insertTile(new Tile({x: x, y: y}, 2));
          var result = this.getMoveMinimaxDFS(newGrid2, alpha, beta, {player: true}, depth - 1);
          beta = Math.min(beta, result.score);
          if (beta <= alpha) {
            terminated = true;
          }

          var newGrid4 = grid.clone();
          newGrid4.insertTile(new Tile({x: x, y: y}, 4));
          result = this.getMoveMinimaxDFS(newGrid4, alpha, beta, {player: true}, depth - 1);
          beta = Math.min(beta, result.score);
          if (beta <= alpha) {
            terminated = true;
          }
        }
      }
    }
    return {score: beta};
  }
};