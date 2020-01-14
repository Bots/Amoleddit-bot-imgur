const snooper = require('reddit-snooper')
const chokidar = require('chokidar')
const request = require('request')
const fs = require('fs')
const imgur = require('imgur')
const axios = require('axios')

require('dotenv').config()

// Set global vars
let author
let imageTitle
let permalink
let imageId
let postUrl
let albumId = process.env.IMGUR_ALBUM_ID

imgur.setCredentials(
    process.env.IMGUR_USERNAME, 
    process.env.IMGUR_PASSWORD, 
    process.env.IMGUR_CLIENT_ID
)

Snooper = new snooper({
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    app_id: process.env.REDDIT_CLIENT_ID,
    api_secret: process.env.REDDIT_CLIENT_SECRET,
    user_agent: process.env.REDDIT_USER_AGENT,

    automatic_retries: true, // automatically handles condition when reddit says 'you are doing this too much'
    api_requests_per_minuite: 60 // api requests will be spread out in order to play nicely with Reddit
})

Snooper.watcher.getPostWatcher('AmoledBackgrounds') // blank argument or 'all' looks at the entire website
    .on('post', function(post) {
        // comment is a object containing all comment data
        console.log(post)
        console.log('posted by: ' + post.data.author)

        let urlMatch = post.data.url.match('\.([a-zA-Z]+$)')
		// Check to make sure the post is not stickied, that it's an image post, and that it contains a link
        if (!post.data.stickied && post.kind === 't3' && urlMatch) {

			// Grab the author, title, and URL
			author = post.data.author
			imageTitle = post.data.title
			permalink = post.data.permalink
			
			// Download the new post
			console.log('New post detected')
			request(post.data.url).pipe(fs.createWriteStream("./pics/newestPost.jpg"))
		}
    })
    .on('error', console.error)

// event listener to watch for new files in pics dir
chokidar.watch('./pics/newestPost.jpg', {
    ignored: /(^|[\/\\])\../,
    usepolling: true,
    interval: 10000,
    awaitWriteFinish: {
        stabilityThreshold: 10000,
        pollInterval: 10000
    }}).on('change', (event, path) => {
    console.log(event);

    // read the media
    var b64content = fs.readFileSync('./pics/newestPost.jpg', { encoding: 'base64' })
    let description = `New post from /r/AmoledBackgrounds from user ${author}. Upvote the post here: www.reddit.com${permalink} #wallpapers #backgrounds #amoled`

    imgur.uploadBase64(b64content, null, imageTitle, description)
    .then(function (json) {
        imageId = json.data.id

        axios({
            method: 'post',
            url: `https://api.imgur.com/3/gallery/image/${imageId}`,
            headers: {
                'Authorization': `Bearer ${process.env.IMGUR_ACCESS_TOKEN}`
            },
            data: {
              title: imageTitle,
              tags: 'amoled, wallpapers, backgrounds'
            }
          }).then((response) => {
            console.log(response);
          }, (error) => {
            console.log(error);
          });
    })
    .catch(function (err) {
        console.error(err.message);
    });
})
