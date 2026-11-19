/**
 * Data and grading behind the lesson page: course structure, Lesson
 * Progress, the Discussion thread and quizzes. The route calls these; the
 * route does not query this data itself.
 */
export {
  getCourseWithDetails,
  getLessonById,
  getModuleById,
  getUserById,
  flattenCourseLessons,
} from "./lib/course";
export {
  getLessonProgress,
  getLessonProgressForCourse,
  markLessonComplete,
  markLessonInProgress,
  getLastWatchPosition,
  calculateWatchProgress,
} from "./lib/progress";
export { getCommentById, getLessonThread, renderThread } from "./lib/thread";
export type { ThreadComment } from "./lib/thread";
export {
  getQuizByLessonId,
  getQuizInLesson,
  getQuizWithQuestions,
  getBestAttempt,
  computeResult,
} from "./lib/quiz";
