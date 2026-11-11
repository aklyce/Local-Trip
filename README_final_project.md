# INFO 253A - Group Project

## Objective

For this project you will accomplish the following:
- Build a front-end application that you and your team designed, in teams of 4 to 5 members
- Learn how to collaborate to build a React application  
- Show off your Front-End skills

The project is split into three parts:
1. Defining your project with your assigned team
2. Implementing your project idea, presenting to the class
3. Writing and reflecting on the project

Your team must complete the following:
- Think of a front end web application that you would like to build and write a proposal
- Build the front end web application from the proposal that you came up with
- Utilize at least one external API
- The data in the front end must be persisted in some mechanism. This can be accomplished using localStorage, or using an external database to save to a database, or another mechanism of your choosing
- You must code the demo in React
- Demo the front end web application and present it to the rest of the class
- Submit a write-up that consists of a description and the purpose of your application and talks about the API that you used

## Dates (Fall 2026)

| Part | Due |
|---|---|
| Part I: proposal (`PROPOSAL.md` pushed, repo link submitted on bCourses, one per team) | Monday, October 26 at 9:00 AM PT |
| Part II: presentations and demo, in person | Week 14, Monday, November 30 |
| Part II and III: all code and `LEARNINGS.md` in the repository | Monday, November 30 at 9:00 AM PT |

## Scope

This is a front-end project, graded on the front end by the rubric at the bottom of this page. Your team may build a back end as well, but only the front end is graded. The data your application shows must come from at least one external API, and the data your users create must persist (localStorage is enough; an external database such as Firebase or Supabase is fine too).

## The team repository

- One person on the team creates the team's GitHub repository (Public, like every other repository in this course) and adds every other member as a collaborator. This is the one repository the whole project lives in; every member pushes to it, and `PROPOSAL.md` and `LEARNINGS.md` sit at its root.
- **No API keys in the repository.** If your API needs a key, keep it in a `.env` file that is listed in `.gitignore`, and share the key with your team outside GitHub. Note that a Vite `VITE_` variable is bundled into the browser, so it is hidden from GitHub, not from your users; for a key that must stay secret, call the API through a small proxy. If you are unsure whether your API's key may be public, ask on bCourses before you commit anything.
- Pick an API you can call from the browser (it sends CORS headers, or it offers a JavaScript SDK). Try one request from a plain `fetch` before you commit to the API in your proposal.

## Part I - Project Brief

Meet as a team and agree on a project idea.

- Each team needs to come up with a web application that they would like to build and why.
- Also decide on the external API that you would be using.
### Sample Project Examples

Here are three detailed examples of projects that meet the rubric criteria:

#### Example 1: Recipe Discovery and Meal Planner
**Overview:** A web application that helps users discover recipes, save favorites, and plan their weekly meals.

**External API:** [Spoonacular API](https://spoonacular.com/food-api) or [Edamam Recipe API](https://www.edamam.com/) - Provides recipe data, nutritional information, and search capabilities

**Key Features:**
- Search recipes by ingredients, cuisine type, or dietary restrictions
- View detailed recipe information including ingredients, instructions, and nutritional data
- Save favorite recipes to a personal collection
- Create weekly meal plans by adding recipes to specific days
- Generate shopping lists based on meal plans

**Data Persistence:** localStorage to save favorite recipes, meal plans, and user preferences

**React Components:** SearchBar, RecipeCard, RecipeDetail, FavoritesList, MealPlanCalendar, ShoppingList

#### Example 2: Movie & TV Show Tracker
**Overview:** A personal entertainment tracker that helps users discover, rate, and keep track of movies and TV shows they want to watch or have watched.

**External API:** [The Movie Database (TMDB) API](https://www.themoviedb.org/documentation/api) - Provides comprehensive movie and TV show data, images, and ratings

**Key Features:**
- Search for movies and TV shows with real-time results
- View detailed information including cast, synopsis, ratings, and trailers
- Categorize content into "Want to Watch," "Currently Watching," and "Completed" lists
- Add personal ratings and reviews for watched content
- Filter and sort personal library by genre, rating, or date added
- View trending movies and personalized recommendations

**Data Persistence:** localStorage to store user's watchlists, ratings, and reviews

**React Components:** SearchInterface, MediaCard, MediaDetail, WatchlistManager, RatingForm, TrendingSection

#### Example 3: Fitness Workout Logger
**Overview:** A fitness application that helps users discover exercises, create custom workouts, and track their fitness progress over time.

**External API:** [ExerciseDB API](https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb) or [Wger Workout Manager API](https://wger.de/en/software/api) - Provides exercise data with instructions, images, and muscle groups

**Key Features:**
- Browse exercises by muscle group, equipment, or difficulty level
- View detailed exercise information with images and instructions
- Create and save custom workout routines
- Log workout sessions with sets, reps, and weights
- Track progress over time with workout history
- Set and monitor fitness goals

**Data Persistence:** localStorage to save custom workouts, workout logs, and progress data (or optionally use Firebase for cloud sync across devices)

**React Components:** ExerciseBrowser, ExerciseDetail, WorkoutBuilder, WorkoutLogger, ProgressTracker, GoalSetter

---

## What to put in your proposal?
  - Team name & your members
  - One paragraph to summarize your idea
  - What External API you plan to use and why
- Push the proposal as `PROPOSAL.md` at the root of the team repository. Submit the repository URL on bCourses (1 submission per team).
- We will read every proposal, comment on the feasibility of the idea and the API, and return comments.

## Part II - Build the project

This is the part where you implement your web application using React. Happy Coding!

Presentations take place in person on Monday, November 30.

- Each team will have one repository where they will push their changes. Please use this new repository for all work on this project.
- This could be the first time where you are using GitHub while collaborating with others. Beware of merge conflicts and editing the same file with someone else.
  - git pull and fetch often
  - Create a structure for your project
  - Divide tasks systematically
- Commit all changes in the repo
- Prepare and deliver your project and a presentation
  - Prep for a 10 minute presentation
  - Limit your slides to 5 pages max.
  - Have a recording or screenshots of the live demo as a fallback, in case the API or the wifi is down during your slot
  - One of the slides must contain the functionality in bulleted form of your project
  - Your live demo must demonstrate the functionality mentioned in the slide deck. It is okay to say that you will add more functionality before the code is due, but what you say in the slide deck must be executed

## Part III - Write about your learnings

- Apart from the 5 slide presentation, make sure that your code is well commented.
- Write a document on what you did and name it `LEARNINGS.md`, at the root of the team repository. This should contain the following:
  - Team name & your members
  - What was your original goal and how much of it were you able to achieve?
  - A description of what your project does and the functionality that it provides
  - What did you learn from the project? Talk about the mistakes you made, challenges you overcame or the tools that you got to learn etc

| Area of Focus | Points |
|---------------|--------|
| Proposal | (10) |
| - Answer all specified questions |  |
| Project and Presentation | (80) |
| - Project must use an external API | 10 |
| - Project must use React | 10 |
| - Project must persist data in some way | 10 |
| - Presentation must talk about functionality to be demoed | 10 |
| - Demo must demonstrate functionality mentioned in Presentation | 40 |
| Learnings | (10) |
| - Answer all specified questions |  |
| Total | 100 |