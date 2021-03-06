/**
 * Copyright ©2020. The Regents of the University of California (Regents). All Rights Reserved.
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

var Default = module.exports = [
  {
    'type': 'view_asset',
    'title': 'View an asset in the Asset Library',
    'points': 0,
    'impact': 2,
    'enabled': true
  },
  {
    'type': 'add_asset',
    'title': 'Add a new asset to the Asset Library',
    'points': 5,
    'enabled': true
  },
  {
    'type': 'like',
    'title': 'Like an asset in the Asset Library',
    'points': 1,
    'impact': 3,
    'enabled': true
  },
  {
    'type': 'dislike',
    'title': 'Dislike an asset in the Asset Library',
    'points': -1,
    'enabled': true
  },
  {
    'type': 'get_view_asset',
    'title': 'Receive a view in the Asset Library',
    'points': 0,
    'enabled': true
  },
  {
    'type': 'get_like',
    'title': 'Receive a like in the Asset Library',
    'points': 1,
    'enabled': true
  },
  {
    'type': 'get_dislike',
    'title': 'Receive a dislike in the Asset Library',
    'points': -1,
    'enabled': true
  },
  {
    'type': 'asset_comment',
    'title': 'Comment on an asset in the Asset Library',
    'points': 3,
    'impact': 6,
    'enabled': true
  },
  {
    'type': 'get_asset_comment',
    'title': 'Receive a comment in the Asset Library',
    'points': 1,
    'enabled': true
  },
  {
    'type': 'get_asset_comment_reply',
    'title': 'Receive a reply on a comment in the Asset Library',
    'points': 1,
    'enabled': true
  },
  {
    'type': 'pin_asset',
    'title': 'Pin an asset for the first time',
    'points': 1,
    'impact': 5,
    'enabled': true
  },
  {
    'type': 'repin_asset',
    'title': 'Re-pin an asset (e.g., pin an asset for the third time)',
    'points': 0,
    'enabled': true
  },
  {
    'type': 'get_pin_asset',
    'title': 'Receive a pin of an asset in the Asset Library',
    'points': 1,
    'enabled': true
  },
  {
    'type': 'get_repin_asset',
    'title': 'Receive a re-pin of an asset in the Asset Library',
    'points': 0,
    'enabled': true
  },
  {
    'type': 'submit_assignment',
    'title': 'Submit a new assignment in Assignments',
    'points': 20,
    'enabled': true
  },
  {
    'type': 'discussion_topic',
    'title': 'Add a new topic in Discussions',
    'points': 5,
    'enabled': true
  },
  {
    'type': 'discussion_entry',
    'title': 'Add an entry on a topic in Discussions',
    'points': 3,
    'enabled': true
  },
  {
    'type': 'get_discussion_entry_reply',
    'title': 'Receive a reply on an entry in Discussions',
    'points': 1,
    'enabled': true
  },
  {
    'type': 'export_whiteboard',
    'title': 'Export a whiteboard to the Asset Library',
    'points': 10,
    'enabled': true
  },
  {
    'type': 'whiteboard_add_asset',
    'title': 'Add an asset to a whiteboard',
    'points': 0,
    'impact': 8,
    'enabled': true
  },
  {
    'type': 'get_whiteboard_add_asset',
    'title': 'Have one\'s asset added to a whiteboard',
    'points': 0,
    'enabled': true
  },
  {
    'type': 'whiteboard_chat',
    'title': 'Leave a chat message on a whiteboard',
    'points': 0,
    'enabled': true
  },
  {
    'type': 'remix_whiteboard',
    'title': 'Remix a whiteboard',
    'points': 0,
    'impact': 10,
    'enabled': true
  },
  {
    'type': 'get_remix_whiteboard',
    'title': 'Have one\'s whiteboard remixed',
    'points': 0,
    'enabled': true
  }
];
