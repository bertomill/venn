-- Delete all related data and auth users
-- Run this in Supabase SQL Editor

-- Delete from all related tables first
DELETE FROM user_interests WHERE user_id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
);

DELETE FROM event_attendees WHERE user_id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
);

DELETE FROM community_members WHERE user_id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
);

DELETE FROM connections WHERE user1_id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
) OR user2_id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
);

DELETE FROM messages WHERE sender_id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
) OR receiver_id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
);

DELETE FROM notifications WHERE user_id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
);

DELETE FROM posts WHERE user_id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
);

-- Delete profiles
DELETE FROM profiles WHERE id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
);

-- Finally delete auth users
DELETE FROM auth.users WHERE id IN (
  '859f8d1c-4cf3-4079-8758-dd26a13be106',
  '75df2701-cf86-4c7f-9fd0-053b8fa7b8b9',
  '68800e56-b17c-44f7-a9ae-d5ef0cd0ba7d',
  '358732de-2c45-435c-a4e0-a95b7c17d934',
  '7781f6ec-1d3b-44af-accd-44efee402f21',
  '4c28e457-1025-4d08-b79f-1e5b274f7fa9',
  '7635b733-aa0b-4c39-80ef-ddeed0959eb4',
  '11bc035c-d577-43f7-85b4-0208c1f77d5a',
  'dec70c77-2be5-47f8-99d7-8ce6bc68bf82',
  '2837c96b-04b9-457b-8fcf-f8a37c9a24ea',
  'b3f83a65-6405-4283-9594-c8b953de950f',
  'be5b2404-b317-4970-a195-5b6900780d38',
  '39793701-28e7-4084-9c92-6c54d6fbce9c'
);
