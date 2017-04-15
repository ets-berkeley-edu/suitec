/**
 * Copyright ©2017. The Regents of the University of California (Regents). All Rights Reserved.
 *
 * Permission to use, copy, modify, and distribute this software and its documentation
 * for educational, research, and not-for-profit purposes, without fee and without a
 * signed licensing agreement, is hereby granted, provided that the above copyright
 * notice, this paragraph and the following two paragraphs appear in all copies,
 * modifications, and distributions.
 *
 * Contact The Office of Technology Licensing, UC Berkeley, 2150 Shattuck Avenue,
 * Suite 510, Berkeley, CA 94720-1620, (510) 643-7201, otl@berkeley.edu,
 * http://ipira.berkeley.edu/industry-info for commercial licensing opportunities.
 *
 * IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT, SPECIAL,
 * INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF
 * THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF REGENTS HAS BEEN ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE
 * SOFTWARE AND ACCOMPANYING DOCUMENTATION, IF ANY, PROVIDED HEREUNDER IS PROVIDED
 * "AS IS". REGENTS HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
 * ENHANCEMENTS, OR MODIFICATIONS.
 */

(function(angular) {

  'use strict';

  angular.module('collabosphere').controller('AssetLibraryManageAssetsController', function(assetLibraryCategoriesFactory, assetLibraryFactory, courseFactory, $scope) {

    // Variable that will keep track of the categories in the current course
    $scope.categories = null;

    // Variable that will keep track of the new category
    $scope.newCategory = null;

    // Variable that will keep track of any other courses using the Asset Library where user is an instructor
    $scope.assetLibraryCourses = null;

    // Variable that will keep track of a destination user ID for migrations
    $scope.destinationUserId = null;

    // Variable that will keep track of in-progress asset migration
    $scope.assetMigration = null;

    /**
     * Get any other courses using the Asset Library where user is an instructor
     *
     * @return {void}
     */
    var getAssetLibraryCourses = function() {
      var courseOptions = {
        admin: true,
        assetLibrary: true,
        excludeCurrent: true
      };
      courseFactory.getCourses(courseOptions).success(function(userCourses) {
        $scope.assetLibraryCourses = _.map(userCourses, function(userCourse) {
          return _.extend({'user_id': userCourse.id}, userCourse.course);
        });
      });
    };

    /**
     * Get the categories for the current course
     *
     * @return {void}
     */
    var getCategories = function() {
      assetLibraryCategoriesFactory.getCategories(true).success(function(categories) {
        $scope.categories = categories;
      });
    };

    /**
     * Create a new category
     *
     * @return {void}
     */
    var createCategory = $scope.createCategory = function() {
      assetLibraryCategoriesFactory.createCategory($scope.newCategory).success(function(category) {
        // Add the created category to the category list
        $scope.categories.push(category);
        // Clear the new category
        $scope.newCategory = null;
      });
    };

    /**
     * Show or hide the edit form for a category
     *
     * @param  {Category}       category          The category for which the edit form should be shown or hidden
     * @return {void}
     */
    var toggleEditCategory = $scope.toggleEditCategory = function(category) {
      // When the category is not being edited yet, the title is cached
      // and the edit form is shown
      if (!category.editing) {
        category.newTitle = category.title;
        category.editing = true;
      } else {
        category.editing = false;
      }
    };

    /**
     * Edit a category
     *
     * @param  {Category}       category          The category that is being edited
     * @return {void}
     */
    var editCategory = $scope.editCategory = function(category) {
      assetLibraryCategoriesFactory.editCategory(category.id, category.newTitle, category.visible).success(function() {
        category.title = category.newTitle;
        toggleEditCategory(category);
      });
    };

    /**
     * Edit an assignment category
     *
     * @param  {Category}       category          The assignment category that is being edited
     * @return {void}
     */
    var editAssignmentCategory = $scope.editAssignmentCategory = function(category) {
      assetLibraryCategoriesFactory.editCategory(category.id, category.title, category.visible);
    };

    /**
     * Delete a category
     *
     * @param  {Category}       category          The category that is being deleted
     * @return {void}
     */
    var deleteCategory = $scope.deleteCategory = function(category) {
      if (confirm('Are you sure you want to delete this category?')) {
        assetLibraryCategoriesFactory.deleteCategory(category.id).success(function() {
          // Delete the category from the category list
          for (var i = 0; i < $scope.categories.length; i++) {
            if ($scope.categories[i].id === category.id) {
              $scope.categories.splice(i, 1);
            }
          }
        });
      }
    };

    /**
     * Copy all user assets to the Asset Library of another course
     *
     * @param  {Number}    destinationUserId    The course-specific SuiteC user id to be associated with migrated assets
     * @return {void}
     */
    var migrateAssets = $scope.migrateAssets = function(destinationUserId) {
      assetLibraryFactory.migrateAssets(destinationUserId).then(function() {
        $scope.assetMigration = 'working';
      }, function(err) {
        $scope.assetMigration = 'error';
      });
    };

    getAssetLibraryCourses();
    getCategories();

  });

}(window.angular));
