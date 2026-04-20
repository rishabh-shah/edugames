// debug mode
            var _debugMode = false;
            
            // global gameHistory object
            var _gameHistory = null;
            var _equation = null;
            var _globalLock = false;
            var _quitFullScreen = false;
            var _language = "en";
            
            
            
            //______________________________
            // Class representing a single player.
            // Used to count points, colours and names.
            function Player(name, colour, id, max, amount)
            {
                if (_debugMode)
                    alert("Player( name=" + name.toString() + ", colour=" + colour.toString() + ", id=" + id.toString(), + ", max=" + max.toString() + ")");
                this.name = name;
                this.colour = colour;
                this.id = id;
                this.points = 0;
                this.pointString = "";
                this.nextPlayer = 0;
                this.cards = [];
                cardString = "";
                cols = Math.round(Math.sqrt(amount+1));
                rows = Math.ceil((amount+1) / cols);
                var i = 0; // counter for cards
                var n = 0; // counter for numbers on cards
                finished = false;
                while (!finished) {
                    for (k=0; k<2 && !finished; k++) {
                        if (Math.random() > 0.5) {
                            this.cards.push(new Card(n, i, rows, cols, this.id));
                            cardString += this.cards[i].html;
                            i++;
                            if (i>amount) finished = true;
                        }
                    }
                    n = Math.round(i*max/(amount-1));
                }
                this.openCards = amount;
                this.hasPassed = false;
                document.getElementById("table_" + this.id).innerHTML = cardString;
                document.getElementById("table_" + this.id).style.display = "block";
                document.getElementById(this.id).style.backgroundColor = this.colour;
                this.hint("");
            }
            

            
            
            //______________________________
            // Adds a point to the player's score,  displays a message with the new score and releases the lock
            Player.prototype.addPoint = function()
            {
                // show message
                this.points += 1;
                this.pointString += " <span class='stars'>&#9733;</span>";
                message = this.name + ": " + this.points.toString();
                if (_language == "en")
                    message += " points.<br/><br/><br/>" + this.pointString;
                if (_language == "de")
                    message += " Punkte.<br/><br/><br/>" + this.pointString;
                document.getElementById(this.id).innerHTML = message;
                document.getElementById(this.id).style.display = "block";
                
                // start time out for hiding message
                setTimeout( function(id) { document.getElementById(id).style.display = "none";  _globalLock = false;}.bind(0, this.id), 1200 );
            };
            
            
            //______________________________
            // Remove all cards that are covered
            Player.prototype.clearUp = function()
            {
                for (i=0; i<this.cards.length; i++) {
                    if (this.cards[i].state === 'suggested') {
                        this.cards[i].remove();
                        this.openCards--;
                    }
                }
            };
            
            
            //______________________________
            // Player confirms his choice of number
            Player.prototype.confirm = function(what)
            {
                message = "";
                switch (what) {
                    case 'part1':
                    case 'part2':
                        if (_language==="en") this.hint("Choose two numbers that add up to the number on the right and press <i>Ready</i>, or press <i>Pass</i>.");
                        if (_language==="de") this.hint("W&auml;hle zwei Zahlen sodass die Zahl rechts stimmt und dr&uuml;cke <i>Fertig</i>, oder dr&uuml;cke <i>Passe</i>.");
                        if (this !== this.nextPlayer)
                            this.nextPlayer.hint("");
                        for (var i=0; i<this.cards.length; i++) {
                            this.cards[i].enable();
                            if (this.nextPlayer !== this)
                                this.nextPlayer.cards[i].disable();
                        }
                        // enable the pass button and disable the confirm button
                        document.getElementById("button_confirm").disabled = true;
                        document.getElementById("button_pass").disabled = false;
                        break;
                    case 'solution':
                        this.hasPassed = false;
                        if (_language==="en") this.hint("Choose a number for " + this.nextPlayer.name + ".");
                        if (_language==="de") this.hint("W&auml;hle eine Zahl f&uuml;r " + this.nextPlayer.name + ".");
                        var open = 0;
                        var max = Math.round(this.cards.length / 4);
                        for (var i=this.cards.length-1; i>-1; i--) {
                            if (this.cards[i].state === "open" && open < max) {
                                this.cards[i].enable();
                                open++;
                            } else {
                                this.cards[i].disable();
                            }
                            if (this.nextPlayer !== this) {
                                this.nextPlayer.cards[i].disable();
                            }
                        }
                        // disable the pass and confirm buttons
                        document.getElementById("button_confirm").disabled = true;
                        document.getElementById("button_pass").disabled = true;
                }
            }
            
            
            //______________________________
            // Displays help for the player (what to do next)
            Player.prototype.hint = function(text)
            {
                document.getElementById("hint_" + this.id).innerHTML = this.name + "<br/>" + this.pointString + "<br/>" + text;
            };
            
            
            //______________________________
            // Query whether player has any open cards left
            Player.prototype.isFinished = function()
            {
                return this.openCards == 0;
            }
            
            //______________________________
            // Pass - remove all highlights and confirm
            Player.prototype.pass = function()
            {
                // update all cards
                this.hasPassed = true;
                for (var i=0; i<this.cards.length; i++) {
                    this.cards[i].suggest(false);
                }
                // disable the pass and confirm buttons
                document.getElementById("button_confirm").disabled = true;
                document.getElementById("button_pass").disabled = true;
            }
            
            
            
            //______________________________
            // Player writes a number into the next part of the equation
            Player.prototype.suggest = function(what, cardId1, cardId2, cardId3)
            {
                if (cardId2!==false)
                    this.cards[cardId2].suggest(false);
                if (cardId3!==false)
                    this.cards[cardId3].suggest(false);
                var card = this.cards[cardId1].suggest(this);
                if (card !== false) {
                    switch (what) {
                        case "part1":
                            // update texts
                            if (_language === "en") this.hint("Choose another number and press <i>Ready</i>, or press <i>Pass</i>.");
                            if (_language === "de") this.hint("W&auml;hle eine weiter Zahl und dr&uuml;cke <i>Fertig</i>, oder dr&uuml;cke <i>Passe</i>.");
                            // disable the confirm and enable the pass button
                            document.getElementById("button_confirm").disabled = true;
                            document.getElementById("button_pass").disabled = false;
                            break;
                        case "part2":
                            // update texts
                            if (_language === "en") this.hint("If you think your answer is correct, press <i>Ready</i>.");
                            if (_language === "de") this.hint("Wenn Du meinst, dass die Zahlen richtig sind, dr&uuml;cke <i>Fertig</i>.");
                            // enable the pass and confirm buttons
                            document.getElementById("button_confirm").disabled = false;
                            document.getElementById("button_pass").disabled = false;
                            break;
                        case "solution":
                            // update texts
                            if (_language === "en") this.hint("Press <i>Ready</i> or choose a different number.");
                            if (_language === "de") this.hint("Dr&uuml;cke <i>Fertig</i> or w&auml;hle eine andere Zahl.");
                            // enable the confirm and disable the pass buttons
                            document.getElementById("button_confirm").disabled = false;
                            document.getElementById("button_pass").disabled = true;
                    }
                }
                return card;
            };
            
            
            
            //______________________________
            // class for a single number card
            // A memory card is represented by two divs with the outside one representing the card
            // and the inside one representing the face. The face div has a class according to the 
            // type: <div class="card"><div class="digits">23</div></div>
            // both divs have distinct IDs
            function Card(meaning, cardIndex, rows, cols, playerId)
            {
                this.state = "open";
                this.meaning = meaning; // the actual number that's on the card
                this.faceId = cardIndex.toString() + "_" + playerId + "_face";     // the respective div id, e.g. "3_face"
                this.index = cardIndex;
                this.cardId = cardIndex.toString() + "_" + playerId + "_card";     // the respective div id for the card, e.g. "3_card"
                this.string = meaning.toString();
                
                // determine sizes for width, left, top and height
                width = Math.floor(38.0 / cols); 
                left = (50.0 - cols*(width+0.7)) / 2.0; 
                height = Math.floor(47.0 / rows);
                fontSize = 12 / cols;
                lineHeight =  30 / cols;
//                alert("width: " + width + ", left: " + left);
                // hack for bug in Chrome on Android
                if (navigator.userAgent.indexOf("Chrome") > -1 && navigator.userAgent.indexOf("Android") > -1) {
                    factor = 0.86;
                    height *= factor;
                    fontSize *= factor;
                    lineHeight *= factor;
                }
                this.html = "<div class=\"card\" id=\"" + this.cardId + "\" style=\"width:" + width.toString() + "vw; height:" + height.toString() + "vh; left:" + left.toString() + "vw;\" onClick=\"_gameHistory.suggest('" + playerId + "', " + this.index.toString() + ");\">"
                    +     "<div class=\"digits\" id=\"" + this.faceId + "\" style=\"font-size:" + fontSize.toString() + "vw; line-height:" + lineHeight.toString() + "vh;\">"
                    +         this.string
                    +     "</div>"
                    + "</div>";
            }
            
            
            
            //______________________________
            // remove the card from the table
            Card.prototype.remove = function()
            {
                this.state = "removed";
                document.getElementById(this.cardId).style.visibility = "hidden";
            };
            
            
            
            //______________________________
            // disable a card
            Card.prototype.disable = function()
            {
                if (this.state === "open") {
                    this.state = "disabled";
                    document.getElementById(this.faceId).style.color = "#bbb";
                }
            };
            
            
            //______________________________
            // disable a card
            Card.prototype.enable = function()
            {
                if (this.state === "disabled") { // don't set suggested cards back to open
                    this.state = "open";
                    document.getElementById(this.faceId).style.color = "#00a";
                }
            };
            
            
            //______________________________
            // highlight a card
            Card.prototype.suggest = function(player)
            {
                index = false;
                colour = false;
                if (player===false && this.state==="suggested") {
                    this.state = "open";
                    colour = "#eaeaea";
                }
                if (player!==false && this.state==="open") {
                    index = this.index;
                    this.state = "suggested";
                    colour = player.colour;
                }
                document.getElementById(this.faceId).style.backgroundColor = colour;
                return index;
            };
            
            
            //______________________________
            // gameHistory object, tracks open cards, removes cards and assigns points
            // player1,2:  players
            function GameHistory(player1, player2)
            {
                if (_debugMode) alert("GameHistory( player1=" + player1.toString() + ", player2=" + player2.toString() + ")");
                this.player1 = player1;
                this.player2 = player2;
                if (player2) {
                    this.player1.nextPlayer = this.player2;
                    this.player2.nextPlayer = this.player1;
                    this.currentPlayer = this.player1;
                    this.nextPlayer = this.player2;
                } else {
                    this.player1.nextPlayer = this.player1;
                    this.currentPlayer = this.player1;
                    this.nextPlayer = this.player1;
                }
                
                // the equation: part1 + part2 = solution
                this.part1 = false;
                this.part2 = false;
                this.solution = false;
                this.nextMove = 'solution';
                this.currentPlayer.confirm("solution");
            }
            
            
            //______________________________
            // a confirm button has been clicked
            GameHistory.prototype.confirm = function()
            {
                switch (this.nextMove) {
                    case 'solution':
                        this.nextPlayer = this.currentPlayer;
                        this.currentPlayer = this.currentPlayer.nextPlayer;
                        this.nextMove = 'part1';
                        break;
                    case 'part1':
                    case 'part2':
                        // calculating points for current player
                        if (this.currentPlayer.cards[this.part1].meaning + this.currentPlayer.cards[this.part2].meaning == this.nextPlayer.cards[this.solution].meaning)
                            this.currentPlayer.addPoint();
                        this.nextMove = 'solution';
                }
                this.currentPlayer.confirm(this.nextMove);
                this.player1.clearUp();
                if (this.player2)
                    this.player2.clearUp();
                if (this.player1.isFinished() || (!this.player2 && this.player2.isFinished()))
                    this.finishGame();
            };
            
            
            //______________________________
            // a pass button has been clicked
            GameHistory.prototype.pass = function()
            {
                this.part1 = false;
                this.part2 = false;
                this.solution = false;
                this.nextMove = "solution";
                this.currentPlayer.pass();
                this.currentPlayer.confirm(this.nextMove);
                this.currentPlayer.hasPassed = true;
                this.updateGui();
                if (this.player1.isFinished() || (!this.player2 && this.player2.isFinished()))
                    this.finishGame();
            }
            
            
            
            //______________________________
            // a card has been clicked -- make a move
            GameHistory.prototype.suggest = function(player, cardIndex)
            {
                if (this.currentPlayer.id == player) {
                    if (!_globalLock) {
                        _globalLock = true;
                        switch (this.nextMove) {
                            case 'part1':
                                this.part1 = this.currentPlayer.suggest(this.nextMove, cardIndex, this.part1, this.part2);
                                this.part2 = false;
                                this.updateGui();
                                this.nextMove = 'part2';
                                break;
                            case 'part2':
                                this.part2 = this.currentPlayer.suggest(this.nextMove, cardIndex, false, false);
                                this.updateGui();
                                this.nextMove = 'part1';
                                break;
                            case 'solution':
                                this.part1 = false;
                                this.part2 = false;
                                this.solution = this.currentPlayer.suggest(this.nextMove, cardIndex, this.solution, false);
                                this.updateGui();
                        }
                        _globalLock = false;
                    }
                }
            };
            
            
            
            //______________________________
            // a card has been clicked -- make a move
            GameHistory.prototype.updateGui = function()
            {
                // find parts
                var part1 = false;
                var part2 = false;
                var solution = false;
                if (this.part1===false && this.part2===false) {
                    part1 = this.part1!==false ? this.nextPlayer.cards[this.part1].meaning : false;
                    part2 = this.part2!==false ? this.nextPlayer.cards[this.part2].meaning : false;
                    solution = this.solution!==false ? this.currentPlayer.cards[this.solution].meaning : false;
                }
                else {
                    part1 = this.part1!==false ? this.currentPlayer.cards[this.part1].meaning : false;
                    part2 = this.part2!==false ? this.currentPlayer.cards[this.part2].meaning : false;
                    solution = this.solution!==false ? this.nextPlayer.cards[this.solution].meaning : false;
                }
                
                // assemble and write equation
                document.getElementById("equation").innerHTML = "<span class='red'>" + (part1!==false ? part1 : "&nbsp;&nbsp;") + "</span>" +  " + " + "<span class='green'>" + (part2!==false ? part2 : "&nbsp;&nbsp;") + "</span>" + " = " + "<span class='blue'>"+ (solution!==false ? solution : "&nbsp;&nbsp;") + "</span>";
                
                // assemble part1 and part2 dots
                part1 = this.part1!==false ? part1 : 0;
                part2 = this.part2!==false ? part2 : 0;                
                partString =  "<span class='red'>";
                for (var i=0; i < part1+part2; i++) {
                    if (i === part1) {
                        partString += "</span><span class='green'>";
                    }
                    if (i % 5 === 0)
                        partString += "&nbsp;";
                    if (i % 10 === 0)
                        partString += "&nbsp;";
                    partString += "&#8226;";
                }
                partString += "</span><br/>";
                
                // assemble solution dots
                solution = solution!==false ? solution : 0;
                solutionString = "<span class='blue'>";
                for (var i=0; i<solution; i++) {
                    if (i % 5 === 0)
                        solutionString += "&nbsp;";
                    if (i % 10 === 0)
                        solutionString += "&nbsp;";
                    solutionString += "&#8226;";
                }
                solutionString += "</span>";
                document.getElementById("helper").innerHTML = partString + solutionString;
            };
            
            
            
            //______________________________
            // start a new game --
            // create a new gameHistory, create new cards, shuffle them
            // and put them face down on the table
            function newGame(max)
            {
                if (_debugMode) alert("newGame(max=" + max.toString() + ")");
                    
                // read player 2 (if missing, we're in single player mode)
                name = document.getElementById("name2_" + _language).value.trim();
                colour = document.getElementById("name2_" + _language).style.backgroundColor;
                amount = max;
                if (name=="") {
                    player2 = false;
                    single = true;
                    document.getElementById("table_player1").style.width = "70vw";
                    document.getElementById("table_player1").style.left = "10vw";
                    amount = Math.floor(2*max/3)*3; // the largest multiple of three that is smaller than twice max
                } else
                    player2 = new Player(name, colour, "player2", max, amount);
                
                // read player 1
                name = document.getElementById("name1_" + _language).value.trim();
                colour = document.getElementById("name1_" + _language).style.backgroundColor;
                player1 = new Player(name, colour, "player1", max, amount);
                
                // create history
                helperSize = 90 / max;
                document.getElementById("helper").style.fontSize = helperSize.toString()+"vw";
                _gameHistory = null;
                _gameHistory = new GameHistory(player1, player2);
            }
            
            
            
            //______________________________
            // start a new game --
            // create a new gameHistory, create new cards, shuffle them
            // and put them face down on the table
            GameHistory.prototype.finishGame = function()
            {
                resultsTable = "<table>"
                resultsTable += "<tr><td>&nbsp;&nbsp;&nbsp;" + this.player1.name
                + "&nbsp;&nbsp;&nbsp;</td><td>&nbsp;&nbsp;&nbsp;" + this.player1.points
                + "&nbsp;&nbsp;&nbsp;</td><td>&nbsp;&nbsp;&nbsp;" + this.player1.pointString
                + "&nbsp;&nbsp;&nbsp;</td></tr>";
                if (this.player2) {
                    resultsTable += "<tr><td>&nbsp;&nbsp;&nbsp;" + this.player2.name
                    + "&nbsp;&nbsp;&nbsp;</td><td>&nbsp;&nbsp;&nbsp;" + this.player2.points
                    + "&nbsp;&nbsp;&nbsp;</td><td>&nbsp;&nbsp;&nbsp;" + this.player2.pointString
                    + "&nbsp;&nbsp;&nbsp;</td></tr>";
                }
                resultsTable += "</table>";
                document.getElementById('results_' + _language).innerHTML = resultsTable;
                proceed("table", "finish_" + _language);
            }
            
            
            //______________________________
            // go to full screen
            function goFullScreen()
            {
                if (_quitFullScreen) {
                    clearTimeout(_quitFullScreen);
                    _quitFullScreen = false;
                } else {
                    if (document.documentElement.requestFullScreen) {  
                        document.documentElement.requestFullScreen();  
                    } else if (document.documentElement.mozRequestFullScreen) {  
                        document.documentElement.mozRequestFullScreen();  
                    } else if (document.documentElement.webkitRequestFullScreen) {  
                        document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);  
                    } else if (document.documentElement.msRequestFullScreen) {  
                        document.documentElement.msRequestFullScreen();  
                    }
                }
            }
            
            
            //______________________________
            // stop full screen
            function quitFullScreen()
            {
                if (document.cancelFullScreen) {  
                    document.cancelFullScreen();  
                } else if (document.mozCancelFullScreen) {  
                    document.mozCancelFullScreen();  
                } else if (document.webkitCancelFullScreen) {  
                    document.webkitCancelFullScreen();  
                } else if (document.msCancelFullScreen) {  
                    document.msCancelFullScreen();  
                } 
                _quitFullScreen = false;
            }
            
            
            
            //______________________________
            // start the session
            function startSession(max, language)
            {
                _language = language;
                if (_language==="en") document.getElementById("button_confirm").innerHTML = "Ready";
                if (_language==="de") document.getElementById("button_confirm").innerHTML = "Fertig";
                if (_language==="en") document.getElementById("button_pass").innerHTML = "Pass";
                if (_language==="de") document.getElementById("button_pass").innerHTML = "Passe";
                goFullScreen();
                newGame(max);
            }
            
            
            
            //______________________________
            // hides the first id and shows the second
            function proceed(hide, show)
            {
                document.getElementById(hide).style.display = "none";
                document.getElementById(show).style.display = "block";
            }
