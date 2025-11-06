# Subscription Based Streaming Platform

## Objective

Create a Subscription-Based Streaming Platform backend that supports features like user subscription to content plans, playback tracking (watch history), and content access control based on subscription plans. The system should be scalable, secure, and optimized for both authenticated user flows and limited unauthenticated access (e.g., viewing trailers or plan details). Use the DRF (Django Rest Framework) or NodeJs (_based on the job role_) for the same.

You're encouraged to use tools like Cursor or GitHub Copilot. But your solution should show architectural decision-making.

## Part 1: Authentication and User Profiles

- A user profile should have basic information, i.e., `Name`, `Bio`, `Picture`, and `Phone number`.
- Create necessary APIs for the following use cases.
  - A user should be able to register & login using Email & Password.
    - You can use JWT to implement this.
    - No 3rd party ( Google, Github, … ) auth integration is required.
  - A user should be able to update profile information.
- A user can view their subscription status and history.
- An admin can manage plans and content.

### Unauthenticated access allowed for

- Viewing available plans
- Viewing public/trailer content

### All other API endpoints require authentication

## Part 2: Content and Media Management

- Users (authenticated or unauthenticated) can browse content library.
- Authenticated users can:
  - Stream full content if subscription plan allows.
  - View recommendations, continue watching, etc.
- Admins can create/update/delete content.

## Part 3: Subscription Plans

- Each plan should include: `name`, `price`, `validity_days`, `access_level` (e.g., Basic, Premium), `max_devices_allowed`, `resolution` (480p, 720p, 1080p, 4K), `description`, `is_active` etc.
- Unauthenticated users can view all available plans.
- Authenticated users can subscribe to a plan, view history, cancel/renew subscription.
- Admins can create/update/delete plans.

## Part 4: Access Control Based on Subscription Plan

- Users with a Basic plan can access only `access_level=Basic` or Free content.
- Premium users can access all content.

## Part 5: Watch History and Progress Tracking

- Track what content a user started, paused, or completed.
- Show “Continue Watching” and “Recently Watched” sections.

## Part 6: Unit Tests and API Documentation

- Write unit test cases for the developed functionality
- Create API documentation for the developed endpoints

## Bonus Enhancements

- Send email notifications for async notifications (_using Django signals, or NodeJS events_).
  - When subscription is about to expire
  - For new content releases in subscribed genres
- Add rate limit in the API
  - Without an authenticated API, anonymous user-based
  - With an authenticated API, user-based

### 🧠 Think Piece

- What parts of your architecture would you scale independently and how?
- How would you partition or archive watch history and analytical logs at scale?
- How would you optimize costs for video storage and high data transfer volumes?
- How would you track active sessions efficiently?
- How would you enforce concurrent streaming limits per subscription plan (e.g., 2 devices)?

## 📂 Submission

- Push to the assigned repository.
- Create `Architecture.md` with:
  - **Setup instructions**
  - **Architecture explanation** (1-2 paragraphs)
  - **Answers to Think Pieces** above
  - Mention any use of AI tooling (e.g., Cursor, GitHub Copilot)

## 📝 Evaluation Criteria

Your submission will be evaluated based on the following criteria:

- Think of this as an app you create during day-to-day operations. You should invest more time to make it rightly engineered than submitting it early.
- Ensure that the APIs meet all the core requirements and behave as expected.
- Code quality & best practices
- API design & developer experience
- Performance & scalability considerations
