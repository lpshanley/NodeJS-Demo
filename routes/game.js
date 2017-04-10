var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('game', { 
		title: 'FPC - Node Demo',
		page: 'Tic-Tac-Toe'
	});
});

module.exports = router;
