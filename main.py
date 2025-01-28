class FolderUploadAPIView(APIView):

    """
    Endpoints for managing folder uploads
    """

    permission_classes = [IsAuthenticated]
    STAGES = {
        'VALIDATION': 'file_validation',
        'DOCUMENT_CREATION': 'document_creation',
        'FOLDER_STRUCTURE': 'folder_structure',
        'RELATION_UPDATE': 'file_folder_relation',
        'ERROR': 'error',
        'COMPLETE': 'upload_complete'
    }

    def get(self, request, collection_uuid, folder_id):
        """
        Return folder details, files & and subfolders inside the folder
        Args:
            request (HttpRequest):
            folder_id (int):
            collection_uuid (str):
        Returns:
            Response: JsonResponse
                - 200 OK:
                - 404 Not Found:
                - 400 Bad Request:
        """

        try:
            collection = Collection.objects.select_related('user').get(id=collection_uuid)
        except Collection.DoesNotExist as e:
            return Response({'message': 'Collection not found', 'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

        # Check if the user is permitted to execute the operation
        has_permission = check_user_collection_permission(request.user, collection)

        if not has_permission:
            return Response(
                {"message": "Permission Denied!", "error": "You do not have permission to access this collection."},
                status=status.HTTP_400_BAD_REQUEST)

        try:
            # Fetch the folder and verify its existence
            folder = Folder.objects.prefetch_related('documents', 'folder_set').get(id=folder_id, collection=collection)
        except Folder.DoesNotExist:
            return Response({"message": "Folder Not Found!", "error": "The specified folder does not exist."},
                            status=status.HTTP_404_NOT_FOUND)

        # Serialize the folder details
        folder_data = FolderSerializer(folder).data
        folder_data['subfolders'] = FolderSerializer(folder.folder_set.all(), many=True, context={'request': request}).data
        folder_data['documents'] = CollectionDocumentSerializer(folder.documents.all(), many=True, context={'request': request}).data
        folder_data['breadcrumb'] = folder.get_breadcrumb()

        return Response(folder_data, status=status.HTTP_200_OK)

    async def get_folder_by_name(self, name, parent_folder, collection_id):
        # This is a synchronous query that can cause issues in async views.
        return await Folder.objects.aget(
            name=name,
            parent_folder=parent_folder,
            collection_id=collection_id
        )

    async def get_unique_folder_name(self, name, parent_folder, collection_id):
        """
        Generate a unique folder name by appending a counter.
        Returns tuple of (unique_name, was_renamed)
        """
        base_name = name
        counter = 0
        current_name = base_name

        while True:
            try:
                # Use sync_to_async for synchronous ORM queries
                await self.get_folder_by_name(current_name, parent_folder, collection_id)
                # Folder exists, increment counter
                counter += 1
                current_name = f"{base_name} ({counter})"
            except Folder.DoesNotExist:
                # Found a unique name
                return current_name, (counter > 0)

    async def stream_progress(self, request, collection_uuid, folder_id=None):
        try:
            # Validate request files
            yield json.dumps({"stage": self.STAGES['VALIDATION'], "message": "Validating request"}) + "\n"
            await asyncio.sleep(0.1)  # Small delay

            if not request.FILES:
                yield json.dumps({"stage": self.STAGES['ERROR'], "message": "No files provided"}) + "\n"
                return

            data = request.POST
            all_files = request.FILES.getlist('files')
            all_paths = data.getlist('paths')
            collection_id = collection_uuid
            folder_mapper = {}
            documents_to_update = []
            renamed_folders = []

            if len(all_files) != len(all_paths):
                yield json.dumps(
                    {"stage": self.STAGES['ERROR'], "message": "Number of files and paths don't match"}) + "\n"
                return

            # Determine root folder
            yield json.dumps({"stage": self.STAGES['FOLDER_STRUCTURE'], "message": "Determining root folder"}) + "\n"
            await asyncio.sleep(0.1)

            root_folder_path = ""
            if folder_id:
                try:
                    root_folder = await Folder.objects.aget(id=folder_id, collection_id=collection_id)
                    root_folder_path = os.path.normpath(root_folder.name)
                    folder_mapper[root_folder_path] = root_folder
                except Folder.DoesNotExist:
                    yield json.dumps({"stage": self.STAGES['ERROR'], "message": "Parent folder not found"}) + "\n"
                    return

            normalized_paths = [
                os.path.normpath(f"{root_folder_path}/{path}") if root_folder_path else os.path.normpath(path)
                for path in all_paths
            ]

            # Validate and filter files
            yield json.dumps({"stage": self.STAGES['VALIDATION'], "message": "Validating files"}) + "\n"
            await asyncio.sleep(0.1)

            valid_files = []
            valid_paths = []
            invalid_files = []

            for file, path in zip(all_files, normalized_paths):
                file_extension = os.path.splitext(file.name)[1].lower()
                if file_extension in ALLOWED_FILE_EXTENSIONS:
                    valid_files.append(file)
                    valid_paths.append(path)
                else:
                    invalid_files.append(file.name)

            if invalid_files:
                yield json.dumps({"stage": self.STAGES['ERROR'], "message": "Some files have invalid extensions",
                                  "invalid_files": invalid_files}) + "\n"

            if not valid_files:
                yield json.dumps({"stage": self.STAGES['ERROR'], "message": "No valid files to upload"}) + "\n"
                return

            # Create documents
            yield json.dumps({"stage": self.STAGES['DOCUMENT_CREATION'], "message": "Creating documents"}) + "\n"
            await asyncio.sleep(0.1)

            created_count = 0
            failed_files = []
            documents = []
            valid_files_length = len(valid_files)

            for file in valid_files:
                try:
                    document = await CollectionDocument.objects.acreate(
                        file_name=file.name,
                        file=file,
                        collection_id=collection_id,
                    )
                    documents.append(document)
                    created_count += 1

                    # Yield progress immediately after each document
                    yield json.dumps({
                        "stage": self.STAGES['DOCUMENT_CREATION'],
                        "message": f"Successfully created document: {file.name}",
                        "created_count": created_count,
                        "valid_files_count": valid_files_length
                    }) + "\n"

                    await asyncio.sleep(0.1)

                except Exception as e:
                    failed_files.append(file.name)
                    yield json.dumps({
                        "stage": self.STAGES['DOCUMENT_CREATION'],
                        "message": f"Failed to create document: {file.name}",
                        "error": str(e)
                    }) + "\n"
                    await asyncio.sleep(0.1)

            if created_count > 0:
                yield json.dumps({
                    "stage": self.STAGES['DOCUMENT_CREATION'],
                    "message": f"Upload finished!",
                    "created_count": created_count,
                    "valid_files_count": valid_files_length
                }) + "\n"
            if failed_files:
                yield json.dumps({
                    "stage": self.STAGES['DOCUMENT_CREATION'],
                    "message": f"Failed to create {len(failed_files)} documents",
                    "failed_files": failed_files
                }) + "\n"

            document_mapper = {
                path: doc for doc, path in zip(documents, valid_paths)
            }

            # Create folder structure
            yield json.dumps({"stage": self.STAGES['FOLDER_STRUCTURE'], "message": "Creating folder structure"}) + "\n"
            for full_path in valid_paths:
                path_parts = []
                current_path = full_path

                while True:
                    current_path, part = os.path.split(current_path)
                    if part:
                        path_parts.append(part)
                    elif current_path:
                        path_parts.append(current_path)
                        break
                    else:
                        break

                path_parts = list(reversed(path_parts))

                for i in range(len(path_parts)):
                    current = path_parts[i]
                    current_full_path = os.path.normpath('/'.join(path_parts[:i + 1]))
                    parent_path = os.path.normpath('/'.join(path_parts[:i])) if i > 0 else None

                    if os.path.splitext(current)[1]:  # It's a file
                        document = document_mapper.get(full_path)
                        if document:
                            parent_folder = folder_mapper.get(parent_path) if parent_path else None
                            document.folder = parent_folder
                            documents_to_update.append(document)
                    else:  # It's a folder
                        if current_full_path not in folder_mapper:
                            parent_folder = folder_mapper.get(parent_path) if parent_path else None

                            # Get unique name for the folder
                            unique_name, was_renamed = await self.get_unique_folder_name(
                                current,
                                parent_folder,
                                collection_id
                            )

                            if was_renamed:
                                renamed_folders.append({
                                    'original_path': current_full_path,
                                    'new_name': unique_name,
                                    'parent_folder': parent_folder.name if parent_folder else None
                                })

                            folder = await Folder.objects.acreate(
                                name=unique_name,
                                parent_folder=parent_folder,
                                collection_id=collection_id
                            )
                            folder_mapper[current_full_path] = folder

            # Update documents relation with folders
            yield json.dumps(
                {"stage": self.STAGES['RELATION_UPDATE'], "message": "Updating document relationships"}) + "\n"
            await asyncio.gather(*[
                document.asave(update_fields=['folder'])
                for document in documents_to_update
            ])

            yield json.dumps({
                "stage": self.STAGES['COMPLETE'],
                "message": "Upload complete",
                "total_files": len(valid_files),
                "total_folders": len(folder_mapper) - (1 if folder_id else 0)
            }) + "\n"

        except Exception as e:
            yield json.dumps({"stage": self.STAGES['ERROR'], "message": str(e)}) + "\n"

    def post(self, request, collection_uuid, folder_id=None):
        """
        This method Uploads folder with files and recursive structure, and streams progress in
        real time.
        Args:
            request (HttpRequest):
            collection_uuid (str):
            folder_id (int):
            - body (formData):
                - files (list):
                - paths (list)
        Returns:
            StreamingHttpResponse
        """

        response = StreamingHttpResponse(
            self.stream_progress(request, collection_uuid, folder_id),
            content_type='text/event-stream'
        )
        # Add headers to prevent buffering
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Transfer-Encoding'] = 'chunked'
        return response

    @transaction.atomic
    def get_unique_folder_name_old(self, name, parent_folder, collection_id):
        """
        Generate a unique folder name by appending a counter.
        Returns tuple of (unique_name, was_renamed)
        """
        base_name = name
        counter = 0
        current_name = base_name

        while True:
            try:
                Folder.objects.get(
                    name=current_name,
                    parent_folder=parent_folder,
                    collection_id=collection_id
                )
                # Folder exists, increment counter
                counter += 1
                current_name = f"{base_name} ({counter})"
            except Folder.DoesNotExist:
                # Found a unique name
                return current_name, (counter > 0)

    @transaction.atomic
    def post_old(self, request, collection_uuid, folder_id=None):
        """
        Uploads folders directly with documents and subfolders inside a folder.
        Args:
            request (HttpRequest):
            collection_uuid (str):
            folder_id (int):
        Returns:
            Response: JsonResponse
                - 201 CREATED: On successful upload.
                - 404 NOT FOUND: If parent folder doesn't exist.
                - 400 BAD REQUEST: If no files are provided or other validation errors.
        """

        try:
            collection = Collection.objects.select_related('user').get(id=collection_uuid)
        except Collection.DoesNotExist as e:
            return Response({'message': 'Collection not found', 'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

        # Check if the user is permitted to execute the operation
        has_permission = check_user_collection_permission(request.user, collection)

        if not has_permission:
            return Response(
                {"message": "Permission Denied!", "error": "You do not have permission to access this collection."},
                status=status.HTTP_400_BAD_REQUEST)

        # Validate request
        if not request.FILES:
            return Response(
                {"error": "No files provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.POST
        all_files = request.FILES.getlist('files')
        all_paths = data.getlist('paths')
        collection_id = collection_uuid
        folder_mapper = {}
        documents_to_update = []
        renamed_folders = []

        # Validate paths
        if len(all_files) != len(all_paths):
            return Response(
                {"error": "Number of files and paths don't match."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Determine root folder
        root_folder_path = ""
        if folder_id:
            try:
                root_folder = Folder.objects.get(id=folder_id, collection_id=collection_id)
                root_folder_path = os.path.normpath(root_folder.name)
                folder_mapper[root_folder_path] = root_folder
            except Folder.DoesNotExist:
                return Response(
                    {"error": "Parent folder not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Adjust paths to include root folder name if provided
        normalized_paths = [
            os.path.normpath(f"{root_folder_path}/{path}") if root_folder_path else os.path.normpath(path)
            for path in all_paths
        ]

        # Filter out invalid files
        valid_files = []
        valid_paths = []
        invalid_files = []

        for file, path in zip(all_files, normalized_paths):
            file_extension = os.path.splitext(file.name)[1].lower()
            if file_extension in ALLOWED_FILE_EXTENSIONS:
                valid_files.append(file)
                valid_paths.append(path)
            else:
                invalid_files.append(file.name)

        # if invalid_files:
        #     return Response({
        #         "error": "Some files have invalid extensions.",
        #         "invalid_files": invalid_files,
        #         "allowed_extensions": list(ALLOWED_FILE_EXTENSIONS)
        #     }, status=status.HTTP_400_BAD_REQUEST)

        if not valid_files:
            return Response(
                {"error": "No valid files to upload."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create documents first
        documents = CollectionDocument.objects.bulk_create(
            [
                CollectionDocument(
                    file_name=file.name,
                    file=file,
                    collection_id=collection_id,
                )
                for file in valid_files
            ]
        )

        # Create document mapper
        document_mapper = {
            path: doc for doc, path in zip(documents, valid_paths)
        }

        # Process each path to create folder structure
        for full_path in valid_paths:
            # Split path into components
            path_parts = []
            current_path = full_path

            while True:
                current_path, part = os.path.split(current_path)
                if part:
                    path_parts.append(part)
                elif current_path:
                    path_parts.append(current_path)
                    break
                else:
                    break

            # Reverse parts to get correct order (root to leaf)
            path_parts = list(reversed(path_parts))

            # Process each component of the path
            for i in range(len(path_parts)):
                current = path_parts[i]
                current_full_path = os.path.normpath('/'.join(path_parts[:i + 1]))
                parent_path = os.path.normpath('/'.join(path_parts[:i])) if i > 0 else None

                if os.path.splitext(current)[1]:  # It's a file
                    document = document_mapper.get(full_path)
                    if document:
                        parent_folder = folder_mapper.get(parent_path) if parent_path else None
                        document.folder = parent_folder
                        documents_to_update.append(document)
                else:  # It's a folder
                    if current_full_path not in folder_mapper:
                        parent_folder = folder_mapper.get(parent_path) if parent_path else None

                        # Get unique name for the folder
                        unique_name, was_renamed = self.get_unique_folder_name(
                            current,
                            parent_folder,
                            collection_id
                        )

                        if was_renamed:
                            renamed_folders.append({
                                'original_path': current_full_path,
                                'new_name': unique_name,
                                'parent_folder': parent_folder.name if parent_folder else None
                            })

                        folder = Folder.objects.create(
                            name=unique_name,
                            parent_folder=parent_folder,
                            collection_id=collection_id
                        )
                        folder_mapper[current_full_path] = folder

        # Bulk update documents with their folder relationships
        if documents_to_update:
            CollectionDocument.objects.bulk_update(documents_to_update, ['folder'])

        # Prepare response
        response_data = {
            "message": "Successfully uploaded folder!",
            "status": "success",
            "total_files": len(valid_files),
            "total_folders": len(folder_mapper) - (1 if folder_id else 0),  # Subtract root folder if it exists
            "invalid_files": invalid_files
        }

        if renamed_folders:
            response_data["renamed_folders"] = renamed_folders

        return Response(response_data, status=status.HTTP_201_CREATED)
