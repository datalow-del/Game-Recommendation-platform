const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'GameZone',
    isAuthenticated: req.oidc.isAuthenticated()
  });
});

router.get('/profile', function (req, res, next) {
  res.render('profile', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    title: 'Profile page'
  });
});

router.get('/games', function (req, res, next) {
  const gamesPerPage = 10; // Number of games to load per scroll
  const page = req.query.page || 1; // Get the current page number from the query parameter

  const offset = (page - 1) * gamesPerPage; // Calculate the offset based on the current page
  fetch("https://api.igdb.com/v4/games", {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Client-ID': '',
      'Authorization': '',
    },
    body: `fields name,id,platforms,rating,category,summary;where platforms = (6) & rating > 1;sort rating desc; limit ${gamesPerPage};`
  })
    .then(response => response.json())
    .then(data => {
      // Check if the response data is an array
      if (Array.isArray(data)) {
        const games = data.map(game => ({
          id: game.id,
          name: game.name,
          rating: game.rating,
          platforms: game.platforms,
          category: game.category,
          summary: game.summary,
          cover: '', // Initialize cover property as empty string
          description: '', // Initialize description property as empty string
          ageRating: '', // Initialize ageRating property as empty string
        }));

        // Fetch cover images, descriptions, and age ratings for each game
        const fetchPromises = games.map(game =>
          Promise.all([
            fetch("https://api.igdb.com/v4/covers", {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Client-ID': '',
                'Authorization': '',
              },
              body: `fields *; where game = ${game.id};`
            })
              .then(response => response.json())
              .then(coverData => {
                // Assuming only one cover image is returned for each game
                if (Array.isArray(coverData) && coverData.length > 0) {
                  game.cover = coverData[0].url; // Assign the cover image URL to the game object
                }
              })
              .catch(err => {
                console.error(err);
                // Handle error if fetching cover image fails for a game
              }),
            fetch("https://api.igdb.com/v4/age_rating_content_descriptions", {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Client-ID': '',
                'Authorization': '',
              },
              body: `fields category,checksum,description;`
            })
              .then(response => response.json())
              .then(ageRatingData => {
                if (Array.isArray(ageRatingData) && ageRatingData.length > 0) {
                  // Assuming only one age rating and content description is returned for each game
                  game.description = ageRatingData[0].content;
                  game.ageRating = ageRatingData[0].rating;
                }
              })
              .catch(err => {
                console.error(err);
                // Handle error if fetching age rating data fails for a game
              })
          ])
        );
        // Wait for all fetch requests to complete
        Promise.all(fetchPromises)
          .then(() => {
            res.render('games', {
              title: 'GameZone',
              isAuthenticated: req.oidc.isAuthenticated(),
              games: games, // Pass the games array to the view
              currentPage: page
            });
          })
          .catch(err => {
            console.error(err);
            next(err);
          });
      } else {
        console.error('Unexpected response structure:', data);
        next(new Error('Unexpected response structure'));
      }
    })
    .catch(err => {
      console.error(err);
      next(err);
    });
});

module.exports = router;
