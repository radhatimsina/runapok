-- Loads the 30 comments from the old WordPress blog.
-- Paste into the Neon SQL editor (Vercel -> Storage -> your database -> Open in Neon -> SQL Editor) and run.
-- Safe to run more than once: comments already loaded are skipped.

INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', NULL, 'D.N Kafley', NULL, 'Hi Rup,

           Superb! You have done really a splendid job by collating your articles maintaining this personal page. Awesome and awe-inspiring is your work. With wishes.', false, 2, '2009-11-01T01:41:37+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2009-11-01-a-damsel-in-distress', NULL, 'devi vai', NULL, 'daju

all poems are extraordinarily titivated.i went through some and heartedly taken over.any one sheldom weave the words as such to give a form to a legible poem like you have done.

i want to be very precise and frank too.all the poems so far i have gone through dance on the same tune and are of  same kind.as far as possible please try to render the readers with different taste.for example u can justfy your poems with rhymes so that the words flow very sweetly. i found the poems carrying many figures of speech like simile,metaphors,personification,pun,aliteration and many more which are very necessary for a poem to survive.

rest is fine.. i will go through more and comment you as  per know.

adieu.. literary salute', false, 3, '2009-11-11T06:21:16+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', NULL, '3636 KINGS WAY,SACRAMENTO ,CALIFORNIA', NULL, 'good job mama. keep it up n let world  to know about our sorrows n difficulties through your emedia.', false, 4, '2010-02-03T04:26:24+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', NULL, 'KAfley Bhai', NULL, 'dear kaka,

 i just went to ur site….it is nice that i could read ur creations….i liked ur poems….

will write u more as i b free. apart of this my regards to you all.

samtse College of education', false, 6, '2010-03-10T07:25:49+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2010-01-28-odd-day-account', NULL, 'Govinda', NULL, 'I’m please to read poem. I’m unknown about you. Where are you now a days. I hope more thing from you.  Thank you Rup dai', false, 7, '2010-03-14T21:08:34+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2010-01-28-odd-day-account', NULL, 'Rup Pokharel', 'https://runapok.wordpress.com', 'Govinda

Thank you for your invaluable sharing. I will try my level best to bring some more of the type.

USA', true, 8, '2010-03-16T02:11:59+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', NULL, 'Bishnu Pokharel', NULL, 'Wonderful RN, U r known by the world. if we give the best to the world, the best will come back to us. keep it up and so your charisma.', false, 9, '2010-03-20T16:18:42+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', NULL, 'Charlotta', 'http://www.used-mercedes-benz.info', 'dear kaka, i just went to ur site….it is nice that i could read ur creations….i liked ur poems….will write u more as i b free. apart of this my regards to you all.samtse College of education

+1', false, 14, '2010-06-18T21:16:39+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2010-04-21-insane-sire', NULL, 'Jogen Gazmere', NULL, 'It is so nicely composed.

You should write this poem in your own handwriting and send by post to Jigme Singhe Wangchuck, care of, Jigme Namgyal Geshar Wangchuck, King of Bhutan.', false, 15, '2010-07-01T02:55:51+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', (SELECT id FROM comments WHERE legacy_id = 9), 'Rup Pokharel', 'https://runapok.wordpress.com', 'Jogen Dai,

Thank you so much for reading my work and for your invaluable suggestion. I have a hope one day the concern person will read this from the same site and read the deeds. Time is a great healer.', true, 16, '2010-07-03T01:42:58+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', NULL, 'Kamal', NULL, 'Rup dai

you have done great job! Keep on doing………

cheers!

Kamal

Aus', false, 18, '2010-09-19T02:39:32+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', (SELECT id FROM comments WHERE legacy_id = 18), 'Tika Sapkota', NULL, 'Dearest mama, It did open the sight for all displaced and dismantled sufferers as well as it adds a beauty to the literature as a whole. Thanks for your dedicated steps and hoping to be a part of the team soon.

Bhanjo', false, 19, '2010-10-01T05:35:22+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2010-04-21-insane-sire', NULL, 'welkin Siskin', NULL, 'This poem  is obviously breaking the screen of barbarism and eying outside the tiny boundary in pursuit of greater harmony’

You are well-refined in minds!

Bravo!!!', false, 20, '2010-11-26T21:52:48+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', NULL, 'Parashar Dahal', NULL, 'Dear Rup sir, you have done great job. I like to have more phots. Rest all good. Thank you', false, 42, '2011-05-05T00:17:50+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', (SELECT id FROM comments WHERE legacy_id = 42), 'Rup Pokharel', 'https://runapok.wordpress.com', 'Dear Parashar jii,

Thank you for browsing. I will try my best to bring some more posts.', true, 43, '2011-05-05T03:21:06+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2011-05-05-anomalous-status', NULL, 'Vidhyapati Mishra', NULL, 'Sir, this has touched me a lot. Thank you so much for such an amazing compilation of words !', false, 71, '2011-08-13T05:37:33+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2011-05-05-anomalous-status', (SELECT id FROM comments WHERE legacy_id = 71), 'Rup Pokharel', 'https://runapok.wordpress.com', 'Vidhya P jii, Thank you for your invaluable words. I am on the road to bring some more of the type.', true, 72, '2011-08-14T06:58:13+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', NULL, 'Editor', 'http://refugeesvoice.com', 'Really this is the great job

Once please glance our blog too in wordpress

http://www.refugeesvoice.wordpress.com

Editor: Hari Kumar Dahal', false, 73, '2011-08-16T08:09:16+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2010-04-21-morbid-echoes', NULL, 'bb.bhutani@yahoo.co.in', NULL, 'Sir,I enjoy with your beautyful poem', false, 93, '2011-11-22T00:28:41+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2010-01-28-under-my-sky', NULL, 'Tika', NULL, 'Nice poem mama.', false, 94, '2011-11-30T20:03:51+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2010-01-28-odd-day-account', NULL, 'Tika', NULL, 'That is a true scenario and is the new wits of progress and hidden aspects of the be-going status of livelihood.

Toils and gathers and uses and lots……………………….is finally a way of living.', false, 97, '2011-12-11T20:13:24+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', NULL, 'Dhurba Rai', NULL, 'Great poems.', false, 167, '2012-05-10T22:43:26+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('about', NULL, 'Shiva Lal Adhikari', NULL, 'Awesome “Aangan” for the Poetic Blooms to sprout where many stressed minds can be refreshed with the creative cool dew drops of poetic arts!', false, 279, '2013-06-15T22:13:16+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2009-11-06-the-abandoned-seed', NULL, 'Lesley', 'http://sopheapfocus.com/index.php/2010/09/burma-vj-people-power-vs-repressive-military-junta/', 'Usually I do not read post on blogs, however I wish to say that this write-up very forced me to take a look at

and do so! Your writing style has been surprised me. Thanks, very great article.', false, 280, '2013-06-20T12:10:47+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2009-11-06-the-abandoned-seed', (SELECT id FROM comments WHERE legacy_id = 280), 'Rup Pokharel', 'https://runapok.wordpress.com', 'Thank you Lesley, your words have  inspired me to concentrate more in the makings of such pieces.', true, 281, '2013-06-20T16:42:19+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2013-07-28-love-stolen-2', NULL, 'Shiva Adhikari', NULL, 'Profound and Deep poem!', false, 293, '2013-07-28T18:44:10+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2013-07-28-love-stolen-2', NULL, 'Karen Dev', NULL, '“To kiss the grave of my other-half

to let her know her lost son is found”

Wow… what a sadistic pleasure! These two lines pierced my already grieving heart.

How?

Real pain i am with

comes in the mind of another unknown

and makes as if I myself is writing my own loss.

Dear Poet, I have found our lost child many months after my wife left us.  The cause of her demise was he. This poem shall remain in my mind as a ever read master piece. May god bless you. Salute your pen.', false, 295, '2013-07-30T00:05:50+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2010-04-21-morbid-echoes', NULL, 'upendra', NULL, 'very well written though I am no critic! I am the last person to write poems on this planet! keep it up and share with the world..', false, 306, '2013-12-26T03:52:46+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2010-04-21-morbid-echoes', NULL, 'kunti', NULL, 'always feel lucky.', false, 318, '2015-03-30T14:25:48+00:00') ON CONFLICT (legacy_id) DO NOTHING;
INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at) VALUES ('2015-06-22-निलो-किताब', NULL, 'tara lal shrestha', NULL, 'त्यही भूटानको कानुनको निलो किताबको एक पानामा १९५७-१९५८ का ती दुर्लभ रसिद, राजाको बिहेमा तिरेको चन्दाको चिर्कटो, चारै राजाको तस्बिर र मसी सुकेको पुरानो त्यो कलम बजैका निधारका चाउरी परेका घेरा हेर्दै भूटानको “समग्र राष्ट्रिय खुसीयाली” सम्झँदै च्यापी दिएँ र त्यही च्याप-च्याप गर्ने झोलाभित्र राखी दिएँ |

This story touched my core of heart and inner conscience. The protagonist, an elderly grand ma represents real mass of common innocent women, who are out of the root. Rootless is the plight and root is in her retrospection, always. 

The use of local dialect and the expression sound real. so is the theme and narration of an antique bag, a symbol of history that can never be erased, though it is seared and bleared. An aesthetically sound story. I must salute to this story writer.  

a challenge to those, who are in the favor of ‘the end of history’!', false, 322, '2015-07-01T17:12:35+00:00') ON CONFLICT (legacy_id) DO NOTHING;

SELECT count(*) AS old_comments_loaded FROM comments WHERE legacy_id IS NOT NULL;
