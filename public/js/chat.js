$(document).ready(function () {

	var socket = io();
	let sessID = Math.floor(Math.random()*167772).toString(16);
	
	let newGame = function(){
		this.playing = false;
		this.playerTurn = false;
		this.opponent = null;
		this.tag = "O";
		this.winner = false;
	}
	
	function gameScan(callback){
		var game = [[],[],[]];

		var hasWinner = false;
		
		for( let row=0, len=3; row<len; row++ ){
			for( let col=0, len=3; col<len; col++ ){
				game[row][col] = $(`#game [data-id="${row}:${col}"]`).text() || false;
			}
		}
		
		function checkCatsGame(){
			let full = true;
			for( let row=0, len=3; row<len; row++ ){
				for( let col=0, len=3; col<len; col++ ){
					if(!(game[row][col])){
						full = false;
						break;
					}
				}
				if(!full) break;
			}
			if(full) callback("cat");
			else callback(hasWinner);
		}
		
		function checkDiagTwo(){
			if((game[2][0])&&game[1][1]&&game[0][2]){
				if((game[2][0] === game[1][1])&&(game[1][1] === game[0][2])){
					hasWinner = game[2][0];
				}
			}
			if( !hasWinner ) checkCatsGame();
			else callback(hasWinner);
		}
		
		function checkDiagOne(){
			if(game[0][0]&&game[1][1]&&game[2][2]){
				if((game[0][0] === game[1][1])&&(game[1][1] === game[2][2])){
					hasWinner = game[0][0];
				}
			}
			if( !hasWinner ) checkDiagTwo();
			else callback(hasWinner);
		}
		
		function checkCol(){
			for( let col=0, len=3; col<len; col++ ){
				if(game[0][col]&&game[1][col]&&game[2][col]){
					if((game[0][col] === game[1][col]) && (game[1][col] === game[2][col])){
						hasWinner = game[0][col];
					}
				}
			}
			if( !hasWinner ) checkDiagOne();
			else callback(hasWinner);
		}
		
		function checkRow(){
			for( let row=0, len=3; row<len; row++ ){
				if(game[row][0]&&game[row][1]&&game[row][2]){
					if((game[row][0] === game[row][1]) && (game[row][1] === game[row][2])){
						hasWinner = game[row][0];
					}
				}
			}
			if( !hasWinner ) checkCol();
			else callback(hasWinner);
		}
		checkRow();

	}
	
	let player = function(){
		this.name = 'user'+Math.ceil(Math.random() * 10000);
		this.id = Math.ceil(Math.random() * 1000000000000);
		this.sess = sessID;
		this.game = new newGame();
	}
	
	let store = {
		get: () => {
			if(!localStorage.user) localStorage.user = JSON.stringify(new player());
			return JSON.parse(localStorage.user);
		},
		update: (k,v) => {
			let temp = JSON.parse(localStorage.user);
			temp[k] = v;
			localStorage.user = JSON.stringify(temp);
		}
	}
	
	var user = store.get();
	
	let updateGame = ( loc, piece, callback ) => {
		$('[data-id="'+loc+'"]').text(piece);
		gameScan(function(winner){
			user.game.winner = winner;
			callback(winner);
		});
	}
	
	function announceWinner(winner){
		if(winner == "cat"){
			$('#status').html('What luck! It was a tie!!!<br>Please refresh your browser to start a new game.')
		} else {
			user.game.tag === user.game.winner ?
				$('#status').html('Congrats... You won the game!<br>Please refresh your browser to start a new game.') :
				$('#status').html('Sorry, it seems you have been bested this time.<br>Please refresh your browser to start a new game.');
		}
	}
	
	// Clear Game data
	user.game = new newGame();
	store.update('game',user.game);
	
	// Gen a new session ID
	store.update('sess',sessID);
	$('#sessionID').text(user.sess);
	
	// Handle new username
	function updateUsername(){
		user.name = $('#data-user').val();
		store.update('name',user.name);
	}
	
	// Update username on blur
	$('#data-user').on('blur',updateUsername);
	
	// Add user ID into DOM
	$('#data-user').val(user.name);
	
	$('#challenge').on('click',function(){
		let opId = $('#opponentID').val().trim();
		if(opId && opId != user.sess){
			$('#opponentID')[0].disabled = true;
			$('#challenge')[0].disabled = true;
			
			user.game.opponent = opId;
			
			let data = {
				playing: false,
				dest: user.game.opponent,
				src: user.sess,
				item: false,
				winner: user.game.winner
			}
			
			$('#status').text('Waiting on opponent');
			
			socket.emit('gameEvent', data);
		}
	});
	
	socket.on('gameEvent', function( data ){
		if(data.dest == user.sess){
			if( !data.playing ){
				let play = confirm(`User ${data.src} has challenged you to a game. Would you like to accept?`);
				if(play){
					user.game.playing = true;
					user.game.opponent = data.src;
					user.game.playerTurn = true;
					user.game.tag = "X";
					$('#opponentID').val( user.game.opponent );
					$('#opponentID')[0].disabled = true;
					$('#challenge')[0].disabled = true;
					$('#status').text('Your turn');
				}
			}
			if( data.playing && (data.src == user.game.opponent) ){
				if(!user.game.winner){
					$('#status').text('Your turn');
					user.game.playing = true;
					user.game.playerTurn = true;
					user.game.opponent = data.src;
					
					let userTag = "X";
					if(data.item && user.game.tag == "X") userTag = "O";
					
					updateGame(data.item, userTag,function(winner){
						if(winner) announceWinner(winner);
					});
					
				}
			}
		}
	});

	let doSumbit = () => {
		socket.emit('chatEvent', {
			msg: $('#msg').val(),
			name: user.name,
			id: user.id
		});
		$('#msg').val('');
		return false;
	}
	
	$('#game').on('click','td',function( e ){
		let $this = this;
		if(!$this.innerText.trim() && user.game.playerTurn){
			updateGame( $this.dataset.id, user.game.tag, function(winner){
				let data = {
					playing: true,
					dest: user.game.opponent,
					src: user.sess,
					item: $this.dataset.id,
					winner: user.game.winner
				}
				user.game.playerTurn = false;
				$('#status').text('Waiting on opponent');
				socket.emit('gameEvent', data);
				if(winner) announceWinner(winner);
			});
			
		}
	});
	
	$("#submit").click(function(){
		if($('#msg').val().trim()) doSumbit();
	});
	
	$('#msg').on('keypress',function(e){
		if( e.charCode === 13 && $('#msg').val().trim() ) doSumbit();
	});

	socket.on('chatEvent', function( data ){
		let name = data.name;
		if( data.id === user.id ) name = "You";
		let msgEle = $('<li>', { 'html': `<strong>${name}:</strong> ${data.msg}` });
		$('#log-out').append( msgEle );
		$('#log-out').animate({ scrollTop: $('#log-out')[0].scrollHeight },100);
	});

});