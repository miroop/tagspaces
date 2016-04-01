/* Copyright (c) 2012-2015 The TagSpaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that
 * can be found in the LICENSE file. */
/* global define, Handlebars, isCordova  */
define(function(require, exports, module) {
  'use strict';
  var homeFolderTitle = 'Home';

  console.log('Loading directories.ui.js ...');
  var TSCORE = require('tscore');
  var tsExtManager = require('tsextmanager');
  var TSPOSTIO = require("tspostioapi");
  var directoryHistory = [];
  var metaTagGroupsHistory = null;
  var dir4ContextMenu = null;
  var alternativeDirectoryNavigatorTmpl = Handlebars.compile(
    '{{#each dirHistory}}' +
    '<div class="btn-group">' +
        '<button class="btn btn-link dropdown-toggle" data-menu="{{@index}}">' +
            '<div class="altNavFolderTitle">{{name}}&nbsp;<i class="fa fa-caret-right"></i></div>'  +
        '</button>' +
        '<div class="dropdown clearfix dirAltNavMenu" id="dirMenu{{@index}}" data-path="{{path}}">' +
            '<ul role="menu" class="dropdown-menu">' +
                '<li class="dropdown-header"><button class="close">&times;</button><span data-i18n="ns.common:actionsForDirectory2"></span>&nbsp;"{{name}}"</li>' +
                '<li><a class="btn btn-link reloadCurrentDirectory" data-path="{{path}}" style="text-align: left"><i class="fa fa-refresh fa-fw fa-lg"></i><span data-i18n="ns.common:reloadCurrentDirectory"></span></a></li>' +
                '<li><a class="btn btn-link createSubdirectory" data-path="{{path}}" style="text-align: left"><i class="fa fa-folder-o fa-fw fa-lg"></i><span data-i18n="ns.common:createSubdirectory"></span></a></li>' +
                '<li><a class="btn btn-link renameDirectory" data-path="{{path}}" style="text-align: left"><i class="fa fa-paragraph fa-fw fa-lg"></i><span data-i18n="ns.common:renameDirectory"></span></a></li>' +
                '<li class="divider" style="width: 100%"></li>' +
                '<li class="dropdown-header"><span data-i18n="ns.common:subfodersOfDirectory2"></span>&nbsp;"{{name}}"</li>' +
                '{{#if children}}' +
                '<div class="dirButtonContainer">{{#each children}}' +
                '<button class="btn dirButton" data-path="{{path}}" title="{{path}}">' +
                '<i class="fa fa-folder-o"></i>&nbsp;{{name}}</button>' +
                '{{/each}}</div>' +
                '{{else}}' +
                '<div><span data-i18n="ns.common:noSubfoldersFound"></span></div>' +
                '{{/if}}' +
                //'<li class="divider" style="width: 100%"></li>' +
                '<li class="dropdown-header"><span data-i18n="ns.common:tagsOfDirectory2">Directory Tags</span></li>' +
            '</ul>' +
        '</div>' +
    '</div>' +
    '{{/each}}'
  );

  var mainDirectoryNavigatorTmpl = Handlebars.compile(
    '<div>{{#each dirHistory}}' +
    '<div class="accordion-group disableTextSelection">' +
        '<div class="accordion-heading btn-group flexLayout" key="{{path}}">' +
            '<button class="btn btn-link btn-lg directoryIcon" data-toggle="collapse" data-target="#dirButtons{{@index}}" key="{{path}}" title="{{../toggleDirectory}}">' +
                '<i class="fa fa-folder fa-fw"></i>' +
            '</button>' +
            '<button class="btn btn-link directoryTitle ui-droppable flexMaxWidth" key="{{path}}" title="{{path}}">{{name}}</button>' +
            '<button class="btn btn-link btn-lg directoryActions" key="{{path}}" title="{{../directoryOperations}}">' +
                '<b class="fa fa-ellipsis-v"></b>' +
            '</button>' +
        '</div>' +
        '<div class="accordion-body collapse in" id="dirButtons{{@index}}">' +
            '<div class="accordion-inner" id="dirButtonsContent{{@index}}" style="padding: 4px;">' +
                '{{#if children}}' +
                '<div class="dirButtonContainer">{{#each children}}' +
                    '<button class="btn btn-sm dirButton ui-droppable" key="{{path}}" title="{{path}}">' +
                        '<div><i class="fa fa-folder-o"></i>&nbsp;{{name}}</div></button>' +
                '{{/each}}</div>' +
                '{{else}}' +
                    '<div>{{../../noSubfoldersFound}}</div>' +
                '{{/if}}' +
            '</div>' +
        '</div>' +
    '</div>' +
    '{{/each}}</div>'
  );

  var locationChooserTmpl = Handlebars.compile(
    '<li class="dropdown-header"><button class="close">&times;</button></li>' +
    '<li class="flexLayout">' +
      '<button style="text-align: left;" class="btn btn-link flexMaxWidth" id="createNewLocation">' +
        '<i class="fa fa-plus"></i>&nbsp;<span data-i18n="[title]ns.common:connectNewLocationTooltip;ns.common:connectNewLocationTooltip">{{connectLocation}}</span>'  +
      '</button>' +
    '</li>' +
    '<li class="divider"></li>' +
    '<li class="dropdown-header" data-i18n="ns.common:yourLocations">{{yourLocations}}</li>' +
    '{{#each locations}}' +
    '<li class="flexLayout">' +
      '<button title="{{path}}" path="{{path}}" name="{{name}}" class="btn btn-link openLocation">' +
      '{{#if isDefault}}' +
        '<i style="color: darkred" class="fa fa-bookmark" data-i18n="[title]ns.dialogs:startupLocation"></i>&nbsp;{{name}}'  +
      '{{else}}' +
        '<i class="fa fa-bookmark"></i>&nbsp;{{name}}'  +
      '{{/if}}' +
      '</button>' +
      '<button type="button" data-i18n="[title]ns.common:editLocation" title="{{editLocationTitle}}" location="{{name}}" path="{{path}}" class="btn btn-link pull-right editLocation">' +
        '<i class="fa fa-pencil fa-lg"></i>' +
      '</button>' +
    '</li>' +
    '{{/each}}'
  );

  function openLocation(path) {
    console.log('Opening location in : ' + path);
    TSCORE.currentLocationObject = TSCORE.Config.getLocation(path);
    if (TSCORE.currentLocationObject !== undefined) {
      document.title = TSCORE.currentLocationObject.name + ' | ' + TSCORE.Config.DefaultSettings.appName;
      $('#locationName').text(TSCORE.currentLocationObject.name).attr('title', path);
      // Handle open default perspective for a location
      var defaultPerspective = TSCORE.currentLocationObject.perspective;
      TSCORE.PerspectiveManager.changePerspective(defaultPerspective);
      // Saving the last opened location path in the settings
      TSCORE.Config.setLastOpenedLocation(path);
      
      if ($('#defaultLocation').prop('checked') === true || $('#defaultLocationEdit').prop('checked') === true) {
        console.log("set default path " + path);
        TSCORE.Config.setDefaultLocation(path);
        $('#defaultLocation').prop('checked', false);
        $('#defaultLocationEdit').prop('checked', false);
      }
      
      TSCORE.Config.saveSettings();
    }
    // Clear search query
    TSCORE.clearSearchFilter();
    // Clears the directory history
    directoryHistory = [];
    navigateToDirectory(path);
    TSCORE.showLocationsPanel();
  }

  function getDirHistoryItem(path) {
    for (var i = 0; i < directoryHistory.length; i++) {
      if (directoryHistory[i].path === path) {
        return directoryHistory[i];
      }
    }
  }

  function loadFolderMetaData(path, element, menuItem) {
    var historyItem = getDirHistoryItem(path);
    if (historyItem.metaData) {
      generateFolderTags(historyItem.metaData.tags, element, menuItem);
      loadMetaTagGroups(historyItem.metaData);
    } else {
      TSCORE.Meta.loadFolderMetaDataPromise(path).then(function(metaData) {
        historyItem.metaData = metaData;
        generateFolderTags(metaData.tags, element, menuItem);
        loadMetaTagGroups(historyItem.metaData);
      }).catch(function(err) {
        console.log("loadFolderMetaData: " + err);
        generateFolderTags(null, element, menuItem);
      });
    }
  }

  function loadMetaTagGroups(metaData) {
    //Load tagGroups only from location folder
    if (TSCORE.Config.getLastOpenedLocation().indexOf(TSCORE.currentPath) >= 0) {
      if (metaTagGroupsHistory) {
        metaTagGroupsHistory.forEach(function(value) {
          TSCORE.Config.deleteTagGroup(value);
        });
      }
      metaTagGroupsHistory = metaData.tagGroups;
      if (metaTagGroupsHistory) {
        metaData.tagGroups.forEach(function(value) {
          TSCORE.Config.addTagGroup(value);
        });
      }
      TSCORE.generateTagGroups(metaData.tagGroups);
    }
  }

  function generateFolderTags(tags, element, menuItem) {
    var $tagsElement = null;
    if (element) {
      var tagId = element.attr('key').split(TSCORE.dirSeparator).pop();
      $tagsElement = $('#' + tagId);
      if ($tagsElement.length === 0) {
        $tagsElement = $('<div style="padding: 4px;"></div>');
        $tagsElement.attr('id', tagId);
        var $el = element.parent().find('.accordion-body');
        if ($el.length > 0) {
          $el.prepend($tagsElement);  
        }
      } else {
        $tagsElement.empty();
      }
    } 
    else if (menuItem) {
      menuItem.empty();
      $tagsElement = $('<div id style="padding: 4px;"></div>');
      menuItem.append($tagsElement);
    } else {
      console.log("generateFolderTags error");
    }

    var tagString = '';
    if (tags) {
      tags.forEach(function(value, index) {
        if (index === 0) {
          tagString = value.title;
        } else {
          tagString = tagString + ',' + value.title;
        }
      });

      var genTagsBtns = TSCORE.generateTagButtons(tagString);
      if (genTagsBtns) {
        $tagsElement.append(genTagsBtns);
      }
    }

    if (TSCORE.PRO && !menuItem) {
      TSCORE.PRO.setContextMenu($tagsElement);
    }

    if (!TSCORE.PRO) {
      $("#locationContent .dropDownIcon").hide();
    }
  }

  // Updates the directory subtree
  function updateSubDirs(dirList) {
    //console.log("Updating subdirs(TSCORE)..."+JSON.stringify(dirList));
    var hasSubFolders = false;
    for (var i = 0; i < directoryHistory.length; i++) {
      if (directoryHistory[i].path === TSCORE.currentPath) {
        directoryHistory[i].children = [];
        for (var j = 0; j < dirList.length; j++) {
          if (!dirList[j].isFile) {
            if (TSCORE.Config.getShowUnixHiddenEntries() || !TSCORE.Config.getShowUnixHiddenEntries() && dirList[j].name.indexOf('.') !== 0) {
              directoryHistory[i].children.push(dirList[j]);
              hasSubFolders = true;
            }
          }
        }
        // Sort the dirList alphabetically
        directoryHistory[i].children.sort(function(a, b) {
          return a.name.localeCompare(b.name);
        });
      }
    }
    generateDirPath();
    generateAlternativeDirPath();
    handleDirCollapsion();
  }

  function generateAlternativeDirPath() {
    console.log('Generating Alternative Directory Path...');

    var $alternativeNavigator = $('#alternativeNavigator');
    $alternativeNavigator.children().remove();

    $alternativeNavigator.html(alternativeDirectoryNavigatorTmpl({
      'dirHistory': directoryHistory
    }));

    $alternativeNavigator.find('.reloadCurrentDirectory').on('click', function() {
      navigateToDirectory($(this).attr('data-path'));
    });

    $alternativeNavigator.find('.createSubdirectory').on('click', function() {
      showCreateDirectoryDialog($(this).attr('data-path'));
    });

    $alternativeNavigator.find('.renameDirectory').on('click', function() {
      showRenameDirectoryDialog($(this).attr('data-path'));
    });

    $alternativeNavigator.find('.dropdown-toggle').on('contextmenu click', function() {
      TSCORE.hideAllDropDownMenus();
      showDropDown('#dirMenu' + $(this).attr('data-menu'), $(this));
      return false;
    });

    $alternativeNavigator.find('.close').on("click", function() {
      TSCORE.hideAllDropDownMenus();
    });

    $alternativeNavigator.find('.dirButton').on("click", function() {
      navigateToDirectory($(this).attr('data-path'));
    });

    if ($alternativeNavigator.i18n) {
      $alternativeNavigator.i18n();
    }
  }

  var showDropDown = function(menuId, sourceObject) {
    var $menu = $(menuId);

    if ($menu.attr('data-path')) {
      var $dropDown = $menu.find('.dropdown-menu');
      var $dropItemTags = $dropDown.find('#tagsAlternativeDirPath');
      if ($dropItemTags.length === 0) {
        $dropItemTags = $('<li id="tagsAlternativeDirPath">');
        $dropDown.append($dropItemTags);
      }
      loadFolderMetaData($menu.attr('data-path'), null, $dropItemTags);
    }

    $menu.css({
      display: 'block',
    });
  };

  function generateDirPath() {
    console.log('Generating Directory Path...');
    var $locationContent = $('#locationContent');
    $locationContent.children().remove();
    $locationContent.html(mainDirectoryNavigatorTmpl({
      'dirHistory': directoryHistory,
      'noSubfoldersFound': $.i18n.t('ns.common:noSubfoldersFound'),
      'toggleDirectory': $.i18n.t('ns.common:toggleDirectory'),
      'directoryOperations': $.i18n.t('ns.common:directoryOperations')
    }));
    $locationContent.find('.directoryTitle').each(function() {
      loadFolderMetaData($(this).attr('key'), $(this).parent());
      $(this).click(function() {
        navigateToDirectory($(this).attr('key'));
      }).droppable({
        greedy: 'true',
        accept: '.fileTitleButton,.fileTile,.fileTileSelector',
        hoverClass: 'dropOnFolder',
        drop: function(event, ui) {
          ui.draggable.detach();
          var filePath = ui.draggable.attr('filepath');
          var fileName = TSCORE.TagUtils.extractFileName(filePath);
          var targetDir = $(this).attr('key');
          console.log('Moving file: ' + filePath + ' to ' + targetDir);
          var newFilePath = targetDir + TSCORE.dirSeparator + fileName;
          TSCORE.IO.renameFilePromise(filePath, newFilePath).then(function(success) {
            TSCORE.hideWaitingDialog();
            TSPOSTIO.renameFile(filePath, newFilePath);
          }, function(err) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog(err);
          });
          $(ui.helper).remove();
        }
      });
    });
    $locationContent.find('.dirButton').each(function() {
      $(this).click(function() {
        navigateToDirectory($(this).attr('key'));
      }).droppable({
        greedy: 'true',
        accept: '.fileTitleButton,.fileTile,.fileTileSelector',
        hoverClass: 'dropOnFolder',
        drop: function(event, ui) {
          ui.draggable.detach();
          // Fixing issue with dropping on stacked/overlapped directories
          if ($(this).parent().parent().parent().hasClass('in')) {
            var filePath = ui.draggable.attr('filepath');
            var fileName = TSCORE.TagUtils.extractFileName(filePath);
            var targetDir = $(this).attr('key');
            console.log('Moving file: ' + filePath + ' to ' + targetDir);
            var newFilePath = targetDir + TSCORE.dirSeparator + fileName;
            TSCORE.IO.renameFilePromise(filePath, newFilePath).then(function(success) {
              TSCORE.hideWaitingDialog();
              TSPOSTIO.renameFile(filePath, newFilePath);
            }, function(err) {
              TSCORE.hideWaitingDialog();
              TSCORE.showAlertDialog(err);
            });
            $(ui.helper).remove();
          }
        }
      });
    });
  }

  function handleDirCollapsion() {
    $('#locationContent').find('.accordion-heading').each(function() {
      var key = $(this).attr('key');
      console.log('Entered Header for: ' + key);
      if (getDirectoryCollapsed(key)) {
        $(this).find('i').removeClass('fa-folder-open');
        $(this).find('i').addClass('fa-folder');
        $(this).next().removeClass('in');
        $(this).next().addClass('out');
      } else {
        $(this).find('i').removeClass('fa-folder');
        $(this).find('i').addClass('fa-folder-open');
        $(this).next().removeClass('out');
        $(this).next().addClass('in');
      }
    });
  }

  function getDirectoryCollapsed(directoryPath) {
    for (var i = 0; i < directoryHistory.length; i++) {
      if (directoryHistory[i].path === directoryPath) {
        return directoryHistory[i].collapsed;
      }
    }
  }

  function setDirectoryCollapse(directoryPath, collapsed) {
    for (var i = 0; i < directoryHistory.length; i++) {
      if (directoryHistory[i].path === directoryPath) {
        directoryHistory[i].collapsed = collapsed;
      }
    }
  }

  function navigateToDirectory(directoryPath) {
    console.log('Navigating to directory: ' + directoryPath);
    // Clearing search results on directory change
    TSCORE.clearSearchFilter();
    // Cleaning the directory path from \\ \ and / 
    if (directoryPath.lastIndexOf('/') + 1 === directoryPath.length || directoryPath.lastIndexOf('\\') + 1 === directoryPath.length) {
      directoryPath = directoryPath.substring(0, directoryPath.length - 1);
    }
    if (directoryPath.lastIndexOf('\\\\') + 1 === directoryPath.length) {
      directoryPath = directoryPath.substring(0, directoryPath.length - 2);
    }
    var directoryFoundOn = -1;
    for (var i = 0; i < directoryHistory.length; i++) {
      if (directoryHistory[i].path === directoryPath) {
        directoryHistory[i].collapsed = false;
        directoryFoundOn = i;
      } else {
        directoryHistory[i].collapsed = true;
      }
    }
    // Removes the history only if it is a completely new path
    if (directoryFoundOn >= 0) {
      var diff1 = directoryHistory.length - (directoryFoundOn + 1);
      if (diff1 > 0) {
        directoryHistory.splice(directoryFoundOn + 1, diff1);
      }
    }
    // If directory path not in history then add it to the history
    if (directoryFoundOn < 0) {
      // var parentLocation = directoryPath.substring(0, directoryPath.lastIndexOf(TSCORE.dirSeparator));
      var parentLocation = TSCORE.TagUtils.extractParentDirectoryPath(directoryPath);
      var parentFound = -1;
      for (var j = 0; j < directoryHistory.length; j++) {
        if (directoryHistory[j].path === parentLocation) {
          parentFound = j;
        }
      }
      if (parentFound >= 0) {
        var diff2 = directoryHistory.length - (parentFound + 1);
        if (diff2 > 0) {
          directoryHistory.splice(parentFound + 1, diff2);
        }
      }
      var locationTitle = directoryPath.substring(directoryPath.lastIndexOf(TSCORE.dirSeparator) + 1, directoryPath.length);
      //ios workarround for empty directory title
      if (isCordovaiOS && locationTitle.length === 0) {
        locationTitle = homeFolderTitle;
      }
      directoryHistory.push({
        'name': locationTitle,
        'path': directoryPath,
        'collapsed': false
      });
    }
    console.log('Dir History: ' + JSON.stringify(directoryHistory));
    TSCORE.currentPath = directoryPath;

    TSCORE.Meta.getDirectoryMetaInformation().then(function(dirList) {
      TSCORE.metaFileList = dirList;
      listDirectory(directoryPath);
    }).catch(function(error) {
      console.log(error);
      TSCORE.metaFileList = undefined;
      listDirectory(directoryPath);
    });
  }

  function listDirectory(dirPath) {
    TSCORE.showLoadingAnimation();
    TSCORE.PerspectiveManager.removeAllFiles();
    TSCORE.IO.listDirectoryPromise(dirPath).then(function(entries) {
      TSPOSTIO.listDirectory(entries);
      console.log("Listing: " + dirPath + " done!");
    }).catch(function(err) {
      TSPOSTIO.errorOpeningPath();
      console.log("Error listing directory" + err);
    });

    if (TSCORE.PRO && TSCORE.Config.getEnableMetaData()) {
      TSCORE.Meta.createMetaFolder(dirPath);
    }
  }

  function initUI() {
    // Context Menus
    $('body').on('contextmenu click', '.directoryActions', function() {
      TSCORE.hideAllDropDownMenus();
      dir4ContextMenu = $(this).attr('key');
      TSCORE.showContextMenu('#directoryMenu', $(this));
      return false;
    });
    // Context menu for the tags in the file table and the file viewer
    $('#directoryMenuReloadDirectory').click(function() {
      navigateToDirectory(dir4ContextMenu);
    });
    $('#directoryMenuCreateDirectory').click(function() {
      showCreateDirectoryDialog(dir4ContextMenu);
    });
    $('#directoryMenuRenameDirectory').click(function() {
      showRenameDirectoryDialog(dir4ContextMenu);
    });
    $('#directoryMenuDeleteDirectory').click(function() {
      var dlgConfirmMsgId = 'ns.dialogs:deleteDirectoryContentConfirm';
      if (TSCORE.Config.getUseTrashCan()) {
        dlgConfirmMsgId = 'ns.pro:trashDirectoryContentConfirm';
      }
      TSCORE.showConfirmDialog($.i18n.t('ns.dialogs:deleteDirectoryTitleConfirm'), $.i18n.t(dlgConfirmMsgId, {
        dirPath: dir4ContextMenu
      }), function() {
        TSCORE.IO.deleteDirectoryPromise(dir4ContextMenu).then(function() {
            TSPOSTIO.deleteDirectory(dir4ContextMenu);
          },
          function(error) {
            TSCORE.hideLoadingAnimation();
            console.error("Deleting directory " + dir4ContextMenu + " failed " + error);
            TSPOSTIO.deleteDirectoryFailed(dir4ContextMenu);
          }
        );
      });
    });
    $('#directoryMenuOpenDirectory').click(function() {
      TSCORE.IO.openDirectory(dir4ContextMenu);
    });
  }

  function createLocation() {
    var locationPath = $('#folderLocation').val();
    TSCORE.Config.createLocation($('#connectionName').val(), locationPath, $('#locationPerspective').val());
    // Enable the UI behavior of a not empty location list
    $('#createNewLocation').attr('title', $.i18n.t('ns.common:connectNewLocationTooltip'));
    $('#locationName').prop('disabled', false);
    $('#selectLocation').prop('disabled', false);
    openLocation(locationPath);
    initLocations();
  }

  function editLocation() {
    var $connectionName2 = $('#connectionName2');
    var $folderLocation2 = $('#folderLocation2');
    TSCORE.Config.editLocation($connectionName2.attr('oldName'), $connectionName2.val(), $folderLocation2.val(), $('#locationPerspective2').val());
    if ($('#defaultLocationEdit').prop('checked') === false) {
      TSCORE.Config.setDefaultLocation(TSCORE.Config.Settings.tagspacesList[0].path);
    }
    openLocation($folderLocation2.val());
    initLocations();
  }

  function selectLocalDirectory() {
    TSCORE.IO.selectDirectory(); //TSCORE.showDirectoryBrowserDialog("/media");               
  }

  function showLocationEditDialog(name, path) {
    require(['text!templates/LocationEditDialog.html'], function(uiTPL) {
      var $dialogLocationEdit = $('#dialogLocationEdit');
      // Check if dialog already created
      if ($dialogLocationEdit.length < 1) {
        var uiTemplate = Handlebars.compile(uiTPL);
        $('body').append(uiTemplate());
        if (isWeb) {
          $('#selectLocalDirectory2').attr('style', 'visibility: hidden');
        } else {
          $('#selectLocalDirectory2').on('click', function(e) {
            e.preventDefault();
            selectLocalDirectory();
          });
        }
        $('#saveLocationButton').on('click', function() {
          editLocation();
        });
        $('#deleteLocationButton').on('click', function() {
          showDeleteFolderConnectionDialog();
        });
      }
      var $connectionName2 = $('#connectionName2');
      var $folderLocation2 = $('#folderLocation2');
      var $locationPerspective2 = $('#locationPerspective2');
      var selectedPerspectiveId = TSCORE.Config.getLocation(path).perspective;
      $locationPerspective2.children().remove();
      tsExtManager.loadExtensionData().then(function() {
        TSCORE.Config.getActivatedPerspectiveExtensions().forEach(function(value) {
          var name = value.name ? value.name : value.id;
          if (selectedPerspectiveId === value.id) {
            $locationPerspective2.append($('<option>').attr('selected', 'selected').text(name).val(value.id));
          } else {
            $locationPerspective2.append($('<option>').text(name).val(value.id));
          }
        });
      });
      $connectionName2.val(name);
      $connectionName2.attr('oldName', name);
      $folderLocation2.val(path);
      $('#dialogLocationEdit').i18n();
      if (isCordova) {
        $('#folderLocation2').attr('placeholder', 'e.g.: DCIM/Camera');
      } else if (isWeb) {
        $('#folderLocation2').attr('placeholder', 'e.g.: /owncloud/remote.php/webdav/');
      }
      $('#formLocationEdit').validator();
      $('#formLocationEdit').submit(function(e) {
        e.preventDefault();
        //if ($('#saveLocationButton').prop('disabled') === false) {
        //  $('#saveLocationButton').click();
        //}
      });
      $('#formLocationEdit').on('invalid.bs.validator', function() {
        $('#saveLocationButton').prop('disabled', true);
      });
      $('#formLocationEdit').on('valid.bs.validator', function() {
        $('#saveLocationButton').prop('disabled', false);
      });
      // Auto focus disabled due usability issue on mobiles
      /*$('#dialogLocationEdit').on('shown.bs.modal', function() {
        $('#folderLocation2').focus();
      });*/
      var isDefault = isDefaultLocation(path);
      $('#defaultLocationEdit').prop('checked', isDefault);
      //$('#defaultLocationEdit').attr('disabled', isDefault);
      $('#dialogLocationEdit').modal({
        backdrop: 'static',
        show: true
      });
      $('#dialogLocationEdit').draggable({
        handle: ".modal-header"
      });
    });
  }

  function showLocationCreateDialog() {
    require(['text!templates/LocationCreateDialog.html'], function(uiTPL) {
      var $dialogCreateFolderConnection = $('#dialogCreateFolderConnection');
      // Check if dialog already created
      if ($dialogCreateFolderConnection.length < 1) {
        var uiTemplate = Handlebars.compile(uiTPL);
        $('body').append(uiTemplate());
        if (isWeb) {
          $('#selectLocalDirectory').attr('style', 'visibility: hidden');
        } else {
          $('#selectLocalDirectory').on('click', function(e) {
            e.preventDefault();
            selectLocalDirectory();
          });
        }
        tsExtManager.loadExtensionData().then(function() {
          TSCORE.Config.getActivatedPerspectiveExtensions().forEach(function(value) {
            var name = value.name ? value.name : value.id;
            $('#locationPerspective').append($('<option>').text(name).val(value.id));
          });         
        });
        $('#createFolderConnectionButton').off();
        $('#createFolderConnectionButton').on('click', function() {
          $('#formLocationCreate').validator('validate');
          if ($(this).hasClass('disabled')) {
            return false;
          } else {
            createLocation();
          }
        });
      }
      $('#connectionName').val('');
      $('#folderLocation').val('');
      $('#dialogCreateFolderConnection').i18n();
      if (isCordova) {
        $('#folderLocation').attr('placeholder', 'e.g.: DCIM/Camera');
      } else if (isWeb) {
        $('#folderLocation').attr('placeholder', 'e.g.: /owncloud/remote.php/webdav/');
      }
      var enableDefaultlocation = (TSCORE.Config.getDefaultLocation() === "");
      $('#defaultLocation').prop('checked', enableDefaultlocation);
      $('#defaultLocation').prop('disabled', enableDefaultlocation);

      $('#formLocationCreate').submit(function(e) {
        e.preventDefault();
        //if ($('#createFolderConnectionButton').prop('disabled') === false) {
        //  $('#createFolderConnectionButton').click();
        //}
      });
      $('#formLocationCreate').off();

      $('#formLocationCreate').on('invalid.bs.validator', function() {
        $('#createFolderConnectionButton').prop('disabled', true);
      });
      $('#formLocationCreate').on('valid.bs.validator', function() {
        $('#createFolderConnectionButton').prop('disabled', false);
      });

      $('#dialogCreateFolderConnection').off();
      $('#dialogCreateFolderConnection').on('shown.bs.modal', function() {
        //$('#folderLocation').focus();
        $('#formLocationCreate').validator('destroy');
        $('#formLocationCreate').validator();
      });
      $('#dialogCreateFolderConnection').modal({
        backdrop: 'static',
        show: true
      });
      $('#dialogCreateFolderConnection').draggable({
        handle: ".modal-header"
      });
    });
  }

  function showCreateDirectoryDialog(dirPath) {
    require(['text!templates/DirectoryCreateDialog.html'], function(uiTPL) {
      if ($('#dialogDirectoryCreate').length < 1) {
        var uiTemplate = Handlebars.compile(uiTPL);
        $('body').append(uiTemplate());
        $('#createNewDirectoryButton').on('click', function() {
          // TODO validate folder name
          var dirPath = $('#createNewDirectoryButton').attr('path') + TSCORE.dirSeparator + $('#newDirectoryName').val();
          TSCORE.IO.createDirectoryPromise(dirPath).then(function() {
            TSPOSTIO.createDirectory(dirPath);
          }, function(error) {
            TSCORE.hideLoadingAnimation();
            console.error("Creating directory " + dirPath + " failed" + error);
            if (error) {
              TSCORE.showAlertDialog(error);
            } else {
              TSCORE.showAlertDialog("Creating " + dirPath + " failed.");
            }
          });
        });
      }
      $('#createNewDirectoryButton').attr('path', dirPath);
      $('#newDirectoryName').val('');
      $('#dialogDirectoryCreate').i18n();
      $('#formDirectoryCreate').validator();
      $('#formDirectoryCreate').submit(function(e) {
        e.preventDefault();
        if ($('#createNewDirectoryButton').prop('disabled') === false) {
          $('#createNewDirectoryButton').click();
        }
      });
      $('#formDirectoryCreate').on('invalid.bs.validator', function() {
        $('#createNewDirectoryButton').prop('disabled', true);
      });
      $('#formDirectoryCreate').on('valid.bs.validator', function() {
        $('#createNewDirectoryButton').prop('disabled', false);
      });
      $('#dialogDirectoryCreate').on('shown.bs.modal', function() {
        $('#newDirectoryName').focus();
      });
      $('#dialogDirectoryCreate').modal({
        backdrop: 'static',
        show: true
      });
      $('#dialogDirectoryCreate').draggable({
        handle: ".modal-header"
      });
    });
  }

  function showRenameDirectoryDialog(dirPath) {
    require(['text!templates/DirectoryRenameDialog.html'], function(uiTPL) {
      if ($('#dialogDirectoryRename').length < 1) {
        var uiTemplate = Handlebars.compile(uiTPL);
        $('body').append(uiTemplate());
        $('#renameDirectoryButton').on('click', function() {
          var dirPath = $('#renameDirectoryButton').attr('path');
          var newDirPath = $('#directoryNewName').val();
          TSCORE.IO.renameDirectoryPromise(dirPath, newDirPath)
          .then(function(newDirName) {
            TSCORE.hideWaitingDialog();
            TSPOSTIO.renameDirectory(dirPath, newDirName);
          }, function(err) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog(err);
          });
        });
      }
      $('#formDirectoryRename').submit(function(e) {
        e.preventDefault();
        if ($('#renameDirectoryButton').prop('disabled') === false) {
          $('#renameDirectoryButton').click();
        }
      });
      $('#formDirectoryRename').on('invalid.bs.validator', function() {
        $('#renameDirectoryButton').prop('disabled', true);
      });
      $('#formDirectoryRename').on('valid.bs.validator', function() {
        $('#renameDirectoryButton').prop('disabled', false);
      });
      $('#renameDirectoryButton').attr('path', dirPath);
      var dirName = TSCORE.TagUtils.extractDirectoryName(dirPath);
      $('#directoryNewName').val(dirName);
      $('#dialogDirectoryRename').i18n();
      $('#dialogDirectoryRename').on('shown.bs.modal', function() {
        $('#directoryNewName').focus();
        $('#formDirectoryRename').validator('destroy');
        $('#formDirectoryRename').validator();
      });
      $('#dialogDirectoryRename').modal({
        backdrop: 'static',
        show: true
      });
      $('#dialogDirectoryRename').draggable({
        handle: ".modal-header"
      });
    });
  }

  function isDefaultLocation(path) {
    return (TSCORE.Config.getDefaultLocation() === path);
  }
  
  function deleteLocation(name) {
    console.log('Deleting folder connection..');
    TSCORE.Config.deleteLocation(name);
    //Opens the first location in the settings after deleting a location  
    if (TSCORE.Config.Settings.tagspacesList.length > 0) {
      openLocation(TSCORE.Config.Settings.tagspacesList[0].path);
      TSCORE.Config.setDefaultLocation(TSCORE.Config.Settings.tagspacesList[0].path);
      TSCORE.Config.saveSettings();
    } else {
      closeCurrentLocation();
      TSCORE.Config.setLastOpenedLocation("");
      TSCORE.Config.setDefaultLocation("");
      TSCORE.Config.saveSettings();
    }
    initLocations();
  }

  function closeCurrentLocation() {
    console.log('Closing location..');
    $('#locationName').text($.i18n.t('ns.common:chooseLocation')).attr('title', '');
    $('#locationContent').children().remove();
    // Clear the footer
    $('#statusBar').children().remove();
    $('#statusBar').text("");
    $('#alternativeNavigator').children().remove();
    TSCORE.disableTopToolbar();
    TSCORE.PerspectiveManager.hideAllPerspectives();
  }

  function showDeleteFolderConnectionDialog() {
    TSCORE.showConfirmDialog($.i18n.t('ns.dialogs:deleteLocationTitleAlert'), $.i18n.t('ns.dialogs:deleteLocationContentAlert', {
      locationName: $('#connectionName2').attr('oldName')
    }), function() {
      deleteLocation($('#connectionName2').attr('oldName'));
      $('#dialogLocationEdit').modal('hide');
    });
  }

  function initLocations() {
    console.log('Creating location menu...');
    var $locationsList = $('#locationsList');
    $locationsList.children().remove();

    TSCORE.Config.Settings.tagspacesList.forEach(function(element) {
      if (isDefaultLocation(element.path)) {
        element.isDefault = true;
      } else {
        element.isDefault = false;
      } 
    });
    $locationsList.html(locationChooserTmpl({
      'locations': TSCORE.Config.Settings.tagspacesList,
      'yourLocations': $.i18n.t('ns.common:yourLocations'),
      'connectLocation': $.i18n.t('ns.common:connectNewLocationTooltip'),
      'editLocationTitle': $.i18n.t('ns.common:editLocation')
    }));
    $locationsList.find('.openLocation').each(function() {
      $(this).on('click', function() {
        openLocation($(this).attr('path'));
      });
    });
    $locationsList.find('.editLocation').each(function() {
      $(this).on('click', function() {
        console.log('Edit location clicked');
        showLocationEditDialog($(this).attr('location'), $(this).attr('path'));
        return false;
      });
    });
    $locationsList.find('#createNewLocation').on('click', function() {
      showLocationCreateDialog();
    });
  }

  // Public API definition
  exports.openLocation = openLocation;
  exports.closeCurrentLocation = closeCurrentLocation;
  exports.updateSubDirs = updateSubDirs;
  exports.initUI = initUI;
  exports.initLocations = initLocations;
  exports.showCreateDirectoryDialog = showCreateDirectoryDialog;
  exports.navigateToDirectory = navigateToDirectory;
  exports.generateFolderTags = generateFolderTags;
  exports.getDirHistoryItem = getDirHistoryItem;
});
