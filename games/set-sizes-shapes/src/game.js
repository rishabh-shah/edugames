//______________________________
            // global variables (I know, bad style; I'll create classes the next iteration)
            var _styles = [];
            var _positions = [];
            var _borders = [50,0,50,0];
            var _motion = null;     // timeout for frames
            var _countdown = null;    // timeout for answers
            var _timeout = 500;     // timeout for answer in milliseconds per object
            var _amount = 0;
            var _characters = ['&#9632;','&#9650;','&#9654;','&#9660;','&#9670;','&#9679;'];
            var _colours = ['#a00;','#0a0;','#00a;','#066;','#606;','#660;','#333;'];
            var _totalScore = 0;
            var _totalPossible = 0;
            var _runs = 20;
            var _runsLeft = 20;
            var _stopLocked = false;
            var _quitFullScreen = false;
            
            
            //______________________________
            // starts the game, goes to full screen, relabels the start button
            function startGame(runs, timeout)
            {
                _runs = runs;
                _runsLeft = runs;
                _timeout = timeout;
                for (i=1; i<5; i++) {
                    document.getElementById('startButton'+i).style.display = 'none';
                }
                document.getElementById('stopButton').style.display = 'inline';
                for (i=0; i<22; i++) {
                    document.getElementById('res'+i).style.display = "none";
                }
                for (i=1; i<10; i++) {
                    document.getElementById('button'+i).style.display = 'inline';
                }
                goFullScreen();
                setTimeout(nextExample, 1000); // wait for one second, the full screen cmd takes a while
            }
            
            
            
            //______________________________
            // finishes the game, exits full screen, relabels the start button
            function stopGame()
            {
                clearTimeout(_countdown);
                for (i=1; i<5; i++) {
                    document.getElementById('startButton'+i).style.display = 'inline';
                }
                document.getElementById('stopButton').style.display = 'none';
                clearTimeout(_motion);
                for (i=1; i<10; i++) {
                    document.getElementById('button'+i).style.display = 'none';
                }
                // score = fraction of runs * fraction of achievable points * 100
                // score = Math.round( ((_runs-_runsLeft-1) / _runs) * (_totalScore / _totalPossible) * 100 ).toString();
                byeString = "You scored " + _totalScore.toString() + " point";
                if (_totalScore!=1) {
                    byeString += "s";
                }
                byeString += ".<br/>See you next time.";
                activate('message', 'canvas', '#ddd', 'messageText', byeString );
                _quitFullScreen = setTimeout(quitFullScreen, 3000);
            }
            
            
            //______________________________
            // function starts a new example
            // initialises all arrays with a random n and randomly starts the motion (either linear or brownian)
            function nextExample()
            {
                // initialise objects and positions
                activate('canvas', 'message');
                activate('buttons', 'results');
                _borders[1] = document.getElementById('canvas').offsetWidth - 70;
                _borders[3] = document.getElementById('canvas').offsetHeight - 70;
                _amount = Math.floor(Math.random() * 9) + 1;
                _animals = [];
                var htmlString = "";
                _positions = [];
                _styles = [];
                newX=100; newY=100;
                character = _characters[ Math.floor(Math.random()*6) ];
                colour = _colours[ Math.floor(Math.random()*7) ];
                for (i=0; i<_amount; i++) {
                    htmlString += "<span id='item"+i+"' class='bubble' style='color:"+colour+";'>"+character+"</span>\n";
                    _positions.push( [0, 0, Math.random()*4-2, Math.random()*4-2] );
                    }
                for (i=0; i<_amount; i++) {
                    do {
                        newX = Math.random() * (_borders[1] - _borders[0]) + _borders[0];
                        newY = Math.random() * (_borders[3] - _borders[2]) + _borders[2];;
                    } while (!isPositionAllowed(i, newX, newY))
                    _positions[i][0] = newX;
                    _positions[i][1] = newY
                }
                document.getElementById('canvas').innerHTML = htmlString;
                
                // collect object _styles
                for (i=0; i<_amount; i++) {
                    _styles.push(document.getElementById('item'+i).style);
                }
                
                // if there are more runs to do, remove stop lock and start next run
                _stopLocked = false;
                _runsLeft--;
                if (_runsLeft >= 0) {
                    if (Math.random()>0.5) {
                        moveBrownian();
                    } else {
                        moveLinear();
                    }
                    _countdown = setTimeout(function() { stop(0); },  400 + _timeout + _timeout * _amount);
                    
                // otherwise quit
                } else {
                    stopGame();
                }
          }
            
            
            //______________________________
            // function applies the current coordinates to screen
            function setPosition()
            {
                for (i=0; i<_amount; i++) {
                    _styles[i].left = _positions[i][0] + 'px';
                    _styles[i].top = _positions[i][1] + 'px';
                }
            }
            
            
            //______________________________
            // function checks whether position x, y is a collision or not.
            // first parameter i is the object number that is ignored in the check
            function isPositionAllowed(i, newX, newY)
            {
                allowed = true;
                for (j=0; j<_amount; j++) {
                    if (i!=j) {
                        distance = Math.sqrt( Math.pow(newX - _positions[j][0], 2) + Math.pow(newY - _positions[j][1], 2) );
                        allowed &= distance > 20;
                    }
                }
                allowed &= (newX > _borders[0]) && (newX < _borders[1]) && (newY > _borders[2]) && (newY < _borders[3]);
                return allowed;
            }
            
            
            //______________________________
            // function creates new coordinates for the next point in a 2D brownian motion
            // call setPosition()
            function moveBrownian()
            {
                for (i=0; i<_amount; i++) {
                
                    // test at most 20 new positions per particle for collisions
                    move = false;
                    newX = 0;
                    newY = 0;
                    for (m=0; m<20 && !move; m++) {                    
                        newX = _positions[i][0] + Math.random()*10-5;
                        newY = _positions[i][1] + Math.random()*10-5;
                        move = isPositionAllowed(i, newX, newY);
                    }
                    
                    // set new coordinates if no collisions occur
                    if (move) {
                        _positions[i][0] = newX;
                        _positions[i][1] = newY;
                    }
                }
                
                // apply coordinates
                setPosition();
                _motion = setTimeout(moveBrownian, 10);
            }
            
            
            //______________________________
            // function calculates coordinates for a linear motion
            // calls setPosition()
            function moveLinear()
            {
                for (i=0; i<_amount; i++) {
                
                    // test at most 20 new positions per particle for collisions
                    move = false;
                    newX = 0;
                    newY = 0;
                    for (m=0; m<20 && !move; m++) {                    
                        newX = _positions[i][0] + _positions[i][2];
                        newY = _positions[i][1] + _positions[i][3];
                        move = isPositionAllowed(i, newX, newY);
                        if (!move) {
                            _positions[i][2] = Math.random()*4-2;
                            _positions[i][3] = Math.random()*4-2;
                        }
                    }
                    
                    // set new coordinates if no collisions occur
                    if (move) {
                        _positions[i][0] = newX;
                        _positions[i][1] = newY;
                    }
                }
                
                // apply coordinates
                setPosition();
                _motion = setTimeout(moveLinear, 10);
            }
            
            
            //______________________________
            // function activates and deactivates div boxes in the body
            function activate(show, hide, colour, textObject, text)
            {
                document.getElementById(show).style.display = 'block';
                document.getElementById(hide).style.display = 'none';
                if (colour) {
                    document.getElementById(show).style.backgroundColor = colour;
                }
                if (textObject && text) {
                    document.getElementById(textObject).innerHTML = text;
                }
            }
            
            
            //______________________________
            // function stops the current motion,
            // activates a div box according to whether n is the current amount of objects or not,
            // and calls nextExample() after a time-out of 1.5 seconds
            function stop(n)
            {
                if (!_stopLocked) {
                
                    // set lock to prevent two stop functions running, clear timeouts, write result
                    _stopLocked = true;
                    clearTimeout(_motion);
                    clearTimeout(_countdown);
                    resultElement = document.getElementById('res' + (_runs - _runsLeft - 1).toString());
                    resultElement.style.display = 'inline';
                    
                    // write main message
                    _totalPossible += _amount;
                    activate('results', 'buttons');
                    if (n==0) {
                        activate('message', 'canvas', '#bbb', 'messageText', "Too slow. There were " + _amount.toString() + '.' );
                        resultElement.innerHTML = _amount.toString() + "<br/>too slow";
                        resultElement.style.backgroundColor = '#ccc';
                    } else if (n==_amount) {
                        if (_amount==1) {
                            activate('message', 'canvas', '#bcb', 'messageText', "Correct! " + _amount.toString() + " point.");
                        } else {
                            activate('message', 'canvas', '#bcb', 'messageText', "Correct! " + _amount.toString() + " points.");
                        }
                        _totalScore += _amount;
                        resultElement.innerHTML = _amount.toString() + "<br/>correct";
                        resultElement.style.backgroundColor = '#cec';
                    }
                    else {
                        activate('message', 'canvas', '#cbb', 'messageText', n.toString() + " is wrong. There were " + _amount.toString() + '.' );
                        resultElement.innerHTML = _amount.toString() + "<br/>wrong";
                        resultElement.style.backgroundColor = '#ecc';
                    }
                    
                    // enable animal
                    rewardId = Math.min(5, Math.floor(_totalScore / 50));
                    className = 'reward_' + rewardId.toString();
                    document.getElementById('messageText').className = className;
                    
                    // start next run per timout
                    setTimeout(nextExample, 1500);
                }
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
