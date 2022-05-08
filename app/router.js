const express = require('express')
const router = express.Router()
const axios = require('axios')
const redis = require('redis')

const DEFAULT_EXPIRATION = 86400
const client = redis.createClient()
client.on('error', (err) => console.log('Redis Client Error', err));
client.connect();
console.log('Redis connected!')

let queryString

router.post("/", function (req, res) {
  queryString = req.body.search.replaceAll(' ', '+');
  res.send({
    search: queryString
  });
  console.log('queryString?', queryString)
});


router.get('/movies', async (req, res) =>{

    const cacheMovies = await client.get('movies')
    if (cacheMovies) {
      return res.json(JSON.parse(cacheMovies))
    }

    const response = await axios.get(`https://www.omdbapi.com/?s=${queryString}&apikey=${process.env.OMDB_KEY}`)

    await client.set('cacheMovies', JSON.stringify(response.data))
    client.expire('cacheMovies', DEFAULT_EXPIRATION)
    return res.status(200).json(response.data)

})

router.get('/movies/:id', async (req, res) => {

  try {

    const cacheMovie = await client.get('cacheCharacter' + req.params.id)
    if (cacheMovie) {
      return res.json(JSON.parse(cacheMovie))
    }

    const response = await axios.get(
          `https://www.omdbapi.com/?i=${req.params.id}&apikey=${process.env.OMDB_KEY}`
          )

    await client.set('cacheMovie' + req.params.id, JSON.stringify(response.data))
    client.expire('cacheMovie', DEFAULT_EXPIRATION)
    return res.json(response.data)

  } catch (err) {
    return res.status(err.response).json({ message: err.message })
  }

})

module.exports = router