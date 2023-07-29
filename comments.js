// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');
const app = express();
const port = 4001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Get all comments for post
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create new comment for post
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id for comment
  const commentId = randomBytes(4).toString('hex');
  // Get the comment content from the request body
  const { content } = req.body;
  // Get the list of comments for the post from the comments object
  const comments = commentsByPostId[req.params.id] || [];
  // Add the new comment to the list of comments
  comments.push({ id: commentId, content, status: 'pending' });
  // Update the comments object
  commentsByPostId[req.params.id] = comments;
  // Emit an event to the event bus
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });
  // Send response to request
  res.status(201).send(comments);
});

// Receive events from the event bus
app.post('/events', async (req, res) => {
  console.log('Received Event: ', req.body.type);
  const { type, data } = req.body;
  // If the event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get the comment by its id
    const { id, postId, status, content } = data;
    const comments = commentsByPostId[postId];
    const comment = comments.find((comment) => {
      return comment.id === id;
    });
    // Update the status of the comment
    comment.status = status;
    // Emit an event to the event bus
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data  : { id, postId, status, content },
    });
    }
    res.send({});
});