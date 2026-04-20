// global gameHistory object
            var _gameHistory = null;
            var _globalLock = false;
            var _quitFullScreen = false;
            var _language = "en";
            
            
            
            //______________________________
            // Class representing a single player.
            // Used to count points, colours and names.
            function Player(name, colour, id)
            {
                this.name = name;
                this.colour = colour;
                this.id = id;
                this.points = 0;
                this.pointString = "";
                this.nextPlayer = 0;
                document.getElementById(this.id).style.backgroundColor = this.colour;
            }
            
            
            //______________________________
            // Proceed to next player, announce, and remove lock
            Player.prototype.next = function()
            {
                // show message
                if (_language == "en")
                    document.getElementById(this.id).innerHTML = "Next turn: " + this.name;
                if (_language == "de")
                    document.getElementById(this.id).innerHTML = "N&auml;chster Zug: " + this.name;
                document.getElementById(this.id).style.display = "block";
                
                // start time out for hiding message
                setTimeout( function(id) { document.getElementById(id).style.display = "none"; _globalLock = false;  }.bind(0, this.id), 700 );
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
                setTimeout( function(id) { document.getElementById(id).style.display = "none";  _globalLock = false;}.bind(0, this.id), 700 );
            }
            
            
            
            //______________________________
            // class for a single memory card
            // A memory card is represented by two divs with the outside one representing the card
            // and the inside one representing the face. The face div has a class according to the 
            // type: <div class="card"><div class="digits">23</div></div>
            // both divs have distinct IDs
            function Card(meaning, type, string, rows, cols)
            {
                this.meaning = meaning; // the actual number that's on the card
                this.type = type;     // whether the card has digits, dots, english, ..., on it
                this.string = string;     // the html representation
                this.random = Math.random();     // a random value used for shuffling
                this.faceId = meaning.toString() + "_" + type + "_face";     // the respective div id, e.g. "3_english_face"
                this.cardId = meaning.toString() + "_" + type + "_card";     // the respective div id for the card, e.g. "3_english_card"
                
                // determine sizes for width, left, top and height
                width = Math.floor(89.0 / cols); 
                left = (100.0 - cols*(width + 1.4)) / 2.0; 
                height = Math.floor(80.0 / rows);
                topValue = (100.0 - rows*(height + 2.4)) / 2.0;
                fontSize = type=="dots" ? 30 / cols : 15 / cols;
                lineHeight =  type=="dots" ? 47 / cols : 80 / cols;
                
                // hack for bug in Chrome on Android
                if (navigator.userAgent.indexOf("Chrome") > -1 && navigator.userAgent.indexOf("Android") > -1) {
                    factor = 0.86;
                    height *= factor;
                    topValue *= factor;
                    fontSize *= factor;
                    lineHeight *= factor;
                }

                this.html = "<div class=\"card\" id=\"" + this.cardId + "\" style=\"width:" + width.toString() + "vw; height:" + height.toString() + "vh; left:" + left.toString() + "vw; top:" + topValue.toString() + "vh;\" onClick=\"_gameHistory.move(" + this.meaning.toString() + ", '" + this.type + "');\">"
                    +     "<div class=\"" + this.type + "\" id=\"" + this.faceId + "\" style=\"font-size:" + fontSize.toString() + "vw; line-height:" + lineHeight.toString() + "vh;\">"
                    +         this.string
                    +     "</div>"
                    + "</div>";
            }
            
            
            
            //______________________________
            // cover the card so its face is hidden
            function coverCard(id)
            {
                faceId = id + "_face";
                document.getElementById(faceId).style.display = "none";
            };
            
            
            
            //______________________________
            // uncover the card so its face is shown
            function uncoverCard(id)
            {
                faceId = id + "_face";
                document.getElementById(faceId).style.display = "block";
            };
            
            
            
            //______________________________
            // remove the card from the table
            function removeCard(id)
            {
                cardId = id + "_card";
                document.getElementById(cardId).style.visibility = "hidden";
            };
            
            
            
            //______________________________
            // highlight a card
            function highlightCard(id, colour)
            {
                faceId = id + "_face";
                document.getElementById(faceId).style.backgroundColor = colour;
            };
            
            
            
            //______________________________
            // gameHistory object, tracks open cards, removes cards and assigns points
            // players: array with players
            function GameHistory(players, moves)
            {
                this.openCards = [];
                this.players = players;
                
                // assigne next players
                for (var i=0; i<this.players.length; i++) {
                    if (i<this.players.length-1)
                        this.players[i].nextPlayer = this.players[i+1];
                    else
                        this.players[i].nextPlayer = this.players[0];
                }
                this.currentPlayer = this.players[0];
                
                // adjust point string if there's only one player
                if (this.players.length == 1) {
                    if (_language == "en")
                        this.currentPlayer.pointString = "moves.";
                    if (_language == "de")
                        this.currentPlayer.pointString = "Z&uuml;ge.";
                }
                this.playerMove = 0;
                this.movesLeft = moves;
            }
            
            
            
            //______________________________
            // a card has been clicked -- make a move
            GameHistory.prototype.move = function(meaning, type)
            {
                if (!_globalLock) {
                    
                    // assemble id
                    id = meaning.toString() + "_" + type;
                    
                    // see whether card is already open (clicked accidentally)
                    var alreadyOpen = false;
                    for (var i=0; i<this.openCards.length; i++)
                        if (id === this.openCards[i][0])
                            alreadyOpen = true;
                    
                    // if not -
                    if (!alreadyOpen) {
                        
                        // lock GUI
                        _globalLock = true;
                        nextTimeOut = 0;
                        
                        // uncover card
                        uncoverCard(id);
                        
                        // push card to memory
                        this.openCards.push([id, meaning]);
                        
                        // cover latest card that's still open
                        if (this.openCards.length > 3)
                            coverCard( this.openCards.shift()[0] );
                            
                        // if three identical cards are open, remove them
                        if (this.openCards.length === 3) {
                            if (this.openCards[0][1] === this.openCards[1][1] && this.openCards[1][1] === this.openCards[2][1]) {
                                
                                // remove cards and increase value for timeout
                                nextTimeOut += 700;
                                for (var i=0; i<3; i++) {
                                    var id = this.openCards.shift()[0];
                                    highlightCard(id, this.currentPlayer.colour);
                                    setTimeout( removeCard.bind(null, id), nextTimeOut );
                                }
                                this.movesLeft -= 1;
                                
                                // add point to current player's score
                                if (this.players.length > 1) {
                                    nextTimeOut += 700;
                                    setTimeout( function(){ _gameHistory.currentPlayer.addPoint(); }, nextTimeOut );
                                }
                            }
                        }
                        else
                            setTimeout( function(){_globalLock=false;}, nextTimeOut );
                        
                        if (this.players.length == 1)
                            this.currentPlayer.points += 1;
                        
                        // if game is over, show results
                        if (this.movesLeft == 0) {
                            nextTimeOut += 700;
                            setTimeout( function(){ finishGame(); proceed('start_' + _language, 'finish_' + _language); quitFullScreen(); }, nextTimeOut );
                        }
                        
                        // otherwise, advance move to next player
                        else {
                            if (this.players.length > 1) {
                                this.playerMove += 1;
                                if (this.playerMove==3) {
                                    this.playerMove = 0;
                                    nextTimeOut += 700;
                                    setTimeout( function(){_gameHistory.currentPlayer = _gameHistory.currentPlayer.nextPlayer; _gameHistory.currentPlayer.next(); }, nextTimeOut);
                                }
                                else
                                    setTimeout( function(){_globalLock=false;}, nextTimeOut );
                            }
                            else
                                setTimeout( function(){_globalLock=false;}, nextTimeOut );
                        }
                    }
                }
            };
            
            
            
            //______________________________
            // helper function for creating cards
            function addToArray(array, meaning, digits, dots, english, german, rows, cols)
            {
                array.push( new Card(meaning, "digits", digits, rows, cols) );
                array.push( new Card(meaning, "dots", dots, rows, cols) );
                if (_language == "en")
                    array.push( new Card(meaning, "english", english, rows, cols) );
                if (_language == "de")
                    array.push( new Card(meaning, "german", german, rows, cols) );
            }
            
            
          
            //______________________________
            // start a new game --
            // create a new gameHistory, create new cards, shuffle them
            // and put them face down on the table
            function newGame(rows, cols)
            {
                // get players and create history
                players = [];
                for (var i=1; i<5; i++) {
                    name = document.getElementById("name" + i.toString() + "_" + _language).value.trim();
                    if( name != "") {
                        id = "player"+i.toString();
                        colour = document.getElementById("name" + i.toString() + "_" + _language).style.backgroundColor;
                        players.push(new Player(name, colour, id) );
                    }
                }
                if (players.length==0) {
                    if (_language == "de")
                        players = [ new Player("Gel&ouml;st in", document.getElementById("name1_de").style.backgroundColor, "player1") ];
                    if (_language == "en")
                        players = [ new Player("Solved in", document.getElementById("name1_en").style.backgroundColor, "player1") ];
                }
                _gameHistory = null;
                _gameHistory = new GameHistory(players, rows*cols/3);
                
                // create array with 5 false and 16 true values at random order
                function Select(value) {
                    this.random = Math.random();
                    this.value = value;
                }
                selections = [];
                for (var i=0; i<21-rows*cols/3; i++)
                    selections.push( new Select(false) );
                for (var i=0; i<rows*cols/3; i++)
                    selections.push( new Select(true) );
                selections.sort(function(a, b) { return a.random - b.random; });
                
                // add rows*cols/3 of 21 available cards
                var cards = [];
                if (selections[0].value)
                    addToArray(cards, 0, "0", "&nbsp;", "Zero", "Null", rows, cols);
                if (selections[1].value)
                    addToArray(cards, 1, "1", "&#8231;", "One", "Eins", rows, cols);
                if (selections[2].value)
                    addToArray(cards, 2, "2", "&#8231;&#8231;", "Two", "Zwei", rows, cols);
                if (selections[3].value)
                    addToArray(cards, 3, "3", "&#8756;", "Three", "Drei", rows, cols);
                if (selections[4].value)
                    addToArray(cards, 4, "4", "&#8280;", "Four", "Vier", rows, cols);
                if (selections[5].value)
                    addToArray(cards, 5, "5", "&#8281;", "Five", "F&uuml;nf", rows, cols);
                if (selections[6].value)
                    addToArray(cards, 6, "6", "<span style='color:#000;'>&#8281;</span>&nbsp;&nbsp;&#8231;", "Six", "Sechs", rows, cols);
                if (selections[7].value)
                    addToArray(cards, 7, "7", "<span style='color:#000;'>&#8281;</span>&nbsp;&nbsp;&#8231;&#8231;", "Seven", "Sieben", rows, cols);
                if (selections[8].value)
                    addToArray(cards, 8, "8", "<span style='color:#000;'>&#8281;</span>&nbsp;&nbsp;&#8756;", "Eight", "Acht", rows, cols);
                if (selections[9].value)
                    addToArray(cards, 9, "9", "<span style='color:#000;'>&#8281;</span>&nbsp;&nbsp;&#8280;", "Nine", "Neun", rows, cols);
                if (selections[10].value)
                    addToArray(cards, 10, "10", "<span style='color:#000;'>&#8281;</span>&nbsp;&nbsp;&#8281;", "Ten", "Zehn", rows, cols);
                if (selections[11].value)
                    addToArray(cards, 11, "11", "<span style='color:#888;'>&#8281;&nbsp;&nbsp;&#8281;</span><br/>&#8231;", "Eleven", "Elf", rows, cols);
                if (selections[12].value)
                    addToArray(cards, 12, "12", "<span style='color:#888;'>&#8281;&nbsp;&nbsp;&#8281;</span><br/>&#8231;&#8231;", "Twelve", "Zw&ouml;lf", rows, cols);
                if (selections[13].value)
                    addToArray(cards, 13, "13", "<span style='color:#888;'>&#8281;&nbsp;&nbsp;&#8281;</span><br/>&#8756;", "Thirteen", "Dreizehn", rows, cols);
                if (selections[14].value)
                    addToArray(cards, 14, "14", "<span style='color:#888;'>&#8281;&nbsp;&nbsp;&#8281;</span><br/>&#8280;", "Fourteen", "Vierzehn", rows, cols);
                if (selections[15].value)
                    addToArray(cards, 15, "15", "<span style='color:#888;'>&#8281;&nbsp;&nbsp;&#8281;</span><br/>&#8281;", "Fifteen", "F&uuml;nfzehn", rows, cols);
                if (selections[16].value)
                    addToArray(cards, 16, "16", "<span style='color:#888;'>&#8281;&nbsp;&nbsp;&#8281;</span><br/><span style='color:#000;'>&#8281;</span>&nbsp;&nbsp;&#8231;", "Sixteen", "Sechzehn", rows, cols);
                if (selections[17].value)
                    addToArray(cards, 17, "17", "<span style='color:#888;'>&#8281;&nbsp;&nbsp;&#8281;</span><br/><span style='color:#000;'>&#8281;</span>&nbsp;&nbsp;&#8231;&#8231;", "Seventeen", "Siebzehn", rows, cols);
                if (selections[18].value)
                    addToArray(cards, 18, "18", "<span style='color:#888;'>&#8281;&nbsp;&nbsp;&#8281;</span><br/><span style='color:#000;'>&#8281;</span>&nbsp;&nbsp;&#8756;", "Eighteen", "Achzehn", rows, cols);
                if (selections[19].value)
                    addToArray(cards, 19, "19", "<span style='color:#888;'>&#8281;&nbsp;&nbsp;&#8281;</span><br/><span style='color:#000;'>&#8281;</span>&nbsp;&nbsp;&#8280;", "Nineteen", "Neunzehn", rows, cols);
                if (selections[20].value)
                    addToArray(cards, 20, "20", "<span style='color:#888;'>&#8281;&nbsp;&nbsp;&#8281;</span><br/><span style='color:#000;'>&#8281;</span>&nbsp;&nbsp;&#8281;", "Twenty", "Zwanzig", rows, cols);
                
                // shuffle cards and assign tags
                cards.sort( function(a, b) { return a.random - b.random; } );
                for (var n=0; n<cards.length; n++)
                    cards[n].tag = "card_" + n.toString();
                
                // put the cards on the table
                var cardString = "";
                for (var n=0; n<cards.length; n++)
                    cardString += cards[n].html;
                document.getElementById("table").innerHTML = cardString;
                
                // announce first player
                _globalLock = false;
                if (_gameHistory.players.length>1) {
                    _globalLock = true;
                    setTimeout( function(){_gameHistory.currentPlayer.next(); }, 1000 );
                }
            }
            
            
            
            //______________________________
            // start a new game --
            // create a new gameHistory, create new cards, shuffle them
            // and put them face down on the table
            function finishGame(rows, cols)
            {
                resultsTable = "<table>"
                for (var i=0; i<_gameHistory.players.length; i++) {
                    player = _gameHistory.players[i];
                    resultsTable += "<tr><td>&nbsp;&nbsp;&nbsp;" + player.name
                    + "&nbsp;&nbsp;&nbsp;</td><td>&nbsp;&nbsp;&nbsp;" + player.points
                    + "&nbsp;&nbsp;&nbsp;</td><td>&nbsp;&nbsp;&nbsp;" + player.pointString
                    + "&nbsp;&nbsp;&nbsp;</td></tr>";
                }
                resultsTable += "</table>";
                document.getElementById('results_' + _language).innerHTML = resultsTable;
                nextTimeOut += 700;
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
            function startSession(rows, cols, language) {
                _language = language;
                goFullScreen();
                newGame(rows, cols);
            }
            
            
            
            //______________________________
            // hides the first id and shows the second
            function proceed(hide, show)
            {
                document.getElementById(hide).style.display = "none";
                document.getElementById(show).style.display = "block";
            }
