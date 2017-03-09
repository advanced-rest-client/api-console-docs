const gulp = require('gulp');
const {Builder} = require('./gulp-tasks/builder.js');

gulp.task('default', function(done) {
  const worker = new Builder();
  worker.build()
  .then(done)
  .catch((e) => {
    console.error(e.message);
    done(new Error(e.message));
  });
});
