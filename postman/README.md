# Sample Postman Collection

This directory contains a sample Postman collection for testing the postman-to-k6-action.

## Collection: JSONPlaceholder API Tests

This collection includes test requests to the [JSONPlaceholder](https://jsonplaceholder.typicode.com/) API, which is a free fake REST API for testing and prototyping.

### Requests Included:

1. **Get Posts** - GET request to retrieve all posts
   - URL: `https://jsonplaceholder.typicode.com/posts`
   - Tests: Validates status code, response time, and data structure

2. **Get Single Post** - GET request to retrieve a single post by ID
   - URL: `https://jsonplaceholder.typicode.com/posts/1`
   - Tests: Validates status code and response data

### Usage

To use this collection with the GitHub Action:

```yaml
- uses: ABNclearroute/postman-to-k6-action@main
  with:
    postman-collection: 'postman/collection.json'
    load-profile: 'smoke'
```

### Testing Locally

You can also import this collection into Postman to test the requests manually:

1. Open Postman
2. Click "Import"
3. Select `collection.json`
4. Run the requests to verify they work

The collection includes test scripts that will validate:
- HTTP status codes
- Response times
- Response data structure
- Required fields in responses

