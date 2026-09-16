-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PAGE', 'REGION', 'DESTINATION', 'JOURNEY', 'EXPERIENCE', 'SERVICE', 'ARTICLE', 'CATEGORY');

-- CreateEnum
CREATE TYPE "DestinationType" AS ENUM ('STATE', 'CITY', 'TOWN', 'NATIONAL_PARK', 'WILDLIFE_SANCTUARY', 'VALLEY', 'LAKE', 'VILLAGE', 'REGION_AREA');

-- CreateEnum
CREATE TYPE "HighlightKind" AS ENUM ('PLACE_TO_VISIT', 'THING_TO_DO', 'BEYOND_OBVIOUS', 'FOOD', 'LOCAL_EXPERIENCE');

-- CreateEnum
CREATE TYPE "JourneyKind" AS ENUM ('JOURNEY', 'RETREAT', 'COURSE', 'BIKE_TOUR');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MODERATE', 'CHALLENGING', 'EXPERT');

-- CreateEnum
CREATE TYPE "ExperienceFormat" AS ENUM ('WALKING', 'FOOD_WALK', 'CYCLING', 'SIGHTSEEING', 'DESERT_EVENING', 'OTHER');

-- CreateEnum
CREATE TYPE "ArticleKind" AS ENUM ('BLOG', 'GUIDE');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('TRAVEL_STYLE', 'EXPERIENCE_THEME', 'ARTICLE_CATEGORY', 'FAQ_CATEGORY');

-- CreateEnum
CREATE TYPE "MediaLicence" AS ENUM ('OWNED', 'LICENSED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MediaRole" AS ENUM ('HERO', 'GALLERY', 'OG', 'INLINE', 'CARD');

-- CreateEnum
CREATE TYPE "RelationOrigin" AS ENUM ('MANUAL', 'SUGGESTED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('HERO', 'RICH_TEXT', 'IMAGE_TEXT', 'GALLERY', 'EDITORIAL_QUOTE', 'CARD_GRID', 'DESTINATION_GRID', 'JOURNEY_GRID', 'EXPERIENCE_GRID', 'SERVICE_GRID', 'ARTICLE_GRID', 'REGION_CAROUSEL', 'INDIA_MAP', 'FAQ', 'TESTIMONIALS', 'CTA', 'VIDEO', 'MAP_EMBED', 'STATS', 'NEWSLETTER', 'TABLE', 'CALLOUT', 'HTML_SAFE');

-- CreateEnum
CREATE TYPE "MetaAttribute" AS ENUM ('NAME', 'PROPERTY', 'HTTP_EQUIV');

-- CreateEnum
CREATE TYPE "TestimonialSource" AS ENUM ('DIRECT', 'GOOGLE', 'TRIPADVISOR', 'OTHER');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'COMPLETED', 'LOST');

-- CreateEnum
CREATE TYPE "EnquiryChannel" AS ENUM ('FORM', 'WHATSAPP_CLICK', 'PHONE_CLICK');

-- CreateEnum
CREATE TYPE "BudgetBand" AS ENUM ('UNDECIDED', 'ESSENTIAL', 'COMFORT', 'PREMIUM', 'LUXURY');

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "NoticeScope" AS ENUM ('GLOBAL', 'REGION', 'DESTINATION', 'JOURNEY', 'EXPERIENCE');

-- CreateEnum
CREATE TYPE "RedirectOrigin" AS ENUM ('MIGRATION', 'SLUG_CHANGE', 'MANUAL');

-- CreateEnum
CREATE TYPE "NavKind" AS ENUM ('LINK', 'MEGA', 'CTA', 'HEADING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ,
    "sessionsValidFrom" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "label" TEXT,
    "diff" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "blurDataUrl" TEXT,
    "sha256" TEXT,
    "altText" TEXT NOT NULL DEFAULT '',
    "title" TEXT,
    "caption" TEXT,
    "description" TEXT,
    "credit" TEXT,
    "licence" "MediaLicence" NOT NULL DEFAULT 'UNKNOWN',
    "folder" TEXT NOT NULL DEFAULT 'uploads',
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "role" "MediaRole" NOT NULL DEFAULT 'GALLERY',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MediaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoMeta" (
    "id" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "h1Override" TEXT,
    "focusKeyword" TEXT,
    "secondaryKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywordVariants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canonicalUrl" TEXT,
    "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImageId" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImageId" TEXT,
    "schemaType" TEXT,
    "customJsonLd" JSONB,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SeoMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomMetaTag" (
    "id" TEXT NOT NULL,
    "seoId" TEXT,
    "attribute" "MetaAttribute" NOT NULL DEFAULT 'NAME',
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomMetaTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "siteTitle" TEXT NOT NULL DEFAULT 'India Uncharted',
    "titleSeparator" TEXT NOT NULL DEFAULT ' | ',
    "defaultMetaTitle" TEXT,
    "defaultMetaDescription" TEXT,
    "defaultKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultRobotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "defaultRobotsFollow" BOOLEAN NOT NULL DEFAULT true,
    "defaultOgTitle" TEXT,
    "defaultOgDescription" TEXT,
    "defaultTwitterTitle" TEXT,
    "defaultTwitterDescription" TEXT,
    "twitterHandle" TEXT,
    "patterns" JSONB NOT NULL DEFAULT '{}',
    "googleVerification" TEXT,
    "bingVerification" TEXT,
    "yandexVerification" TEXT,
    "pinterestVerification" TEXT,
    "ga4Id" TEXT,
    "gtmId" TEXT,
    "metaPixelId" TEXT,
    "consentRequired" BOOLEAN NOT NULL DEFAULT true,
    "customHeadTags" JSONB NOT NULL DEFAULT '[]',
    "organizationJsonLd" JSONB,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SeoSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "origin" "RedirectOrigin" NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "lastHitAt" TIMESTAMPTZ,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Redirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotFoundLog" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "lastReferrer" TEXT,
    "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotFoundLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intro" TEXT,
    "body" JSONB,
    "heroId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "categoryId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqAssignment" (
    "id" TEXT NOT NULL,
    "faqId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FaqAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedLink" (
    "id" TEXT NOT NULL,
    "fromType" "EntityType" NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" "EntityType" NOT NULL,
    "toId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "origin" "RelationOrigin" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelatedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "ownerType" "EntityType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "props" JSONB NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "shortDescription" TEXT,
    "intro" JSONB,
    "mapKey" TEXT,
    "heroId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "type" "DestinationType" NOT NULL DEFAULT 'CITY',
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "regionId" TEXT,
    "parentId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "shortDescription" TEXT,
    "intro" JSONB,
    "whyVisit" JSONB,
    "bestTime" TEXT,
    "weather" TEXT,
    "howToReach" TEXT,
    "localTransport" TEXT,
    "recommendedDuration" TEXT,
    "food" JSONB,
    "culture" JSONB,
    "festivals" JSONB,
    "travelTips" JSONB,
    "whereToStay" JSONB,
    "isOffbeat" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "heroId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationHighlight" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "kind" "HighlightKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "mediaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DestinationHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "JourneyKind" NOT NULL DEFAULT 'JOURNEY',
    "days" INTEGER,
    "nights" INTEGER,
    "durationLabel" TEXT,
    "shortDescription" TEXT,
    "overview" JSONB,
    "idealFor" TEXT,
    "tourType" TEXT,
    "pickupDrop" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whyChoose" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accommodationNote" TEXT,
    "transportNote" TEXT,
    "practicalInfo" JSONB,
    "bestTime" TEXT,
    "priceFromInr" INTEGER,
    "quoteOnly" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "heroId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyStop" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "nights" INTEGER,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JourneyStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryDay" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" JSONB,
    "overnightDestinationId" TEXT,
    "meals" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeTourDetail" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "totalDistanceKm" INTEGER,
    "terrain" TEXT,
    "difficulty" "Difficulty",
    "supportVehicle" TEXT,
    "motorcycleModel" TEXT,
    "riderRequirements" TEXT,
    "safetyInfo" TEXT,
    "bestRidingSeason" TEXT,

    CONSTRAINT "BikeTourDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyStyle" (
    "journeyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "JourneyStyle_pkey" PRIMARY KEY ("journeyId","categoryId")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" "ExperienceFormat" NOT NULL DEFAULT 'OTHER',
    "destinationId" TEXT,
    "location" TEXT,
    "duration" TEXT,
    "bestTime" TEXT,
    "shortDescription" TEXT,
    "overview" JSONB,
    "whatToExpect" JSONB,
    "thingsToKnow" JSONB,
    "travelTips" JSONB,
    "pickupDrop" TEXT,
    "idealFor" TEXT,
    "tourType" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceFromInr" INTEGER,
    "quoteOnly" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "heroId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceStep" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExperienceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceTheme" (
    "experienceId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExperienceTheme_pkey" PRIMARY KEY ("experienceId","categoryId")
);

-- CreateTable
CREATE TABLE "JourneyExperience" (
    "journeyId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JourneyExperience_pkey" PRIMARY KEY ("journeyId","experienceId")
);

-- CreateTable
CREATE TABLE "ExperienceTag" (
    "experienceId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ExperienceTag_pkey" PRIMARY KEY ("experienceId","tagId")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" JSONB,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "process" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "heroId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT,
    "seats" INTEGER,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mediaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatarId" TEXT,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ArticleKind" NOT NULL DEFAULT 'BLOG',
    "excerpt" TEXT,
    "body" JSONB,
    "authorId" TEXT,
    "categoryId" TEXT,
    "readingMinutes" INTEGER,
    "tocEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "heroId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ,
    "contentUpdatedAt" TIMESTAMPTZ,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleDestination" (
    "articleId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,

    CONSTRAINT "ArticleDestination_pkey" PRIMARY KEY ("articleId","destinationId")
);

-- CreateTable
CREATE TABLE "ArticleJourney" (
    "articleId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,

    CONSTRAINT "ArticleJourney_pkey" PRIMARY KEY ("articleId","journeyId")
);

-- CreateTable
CREATE TABLE "ArticleExperience" (
    "articleId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,

    CONSTRAINT "ArticleExperience_pkey" PRIMARY KEY ("articleId","experienceId")
);

-- CreateTable
CREATE TABLE "ArticleTag" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "headline" TEXT,
    "location" TEXT,
    "avatarId" TEXT,
    "rating" INTEGER,
    "source" "TestimonialSource" NOT NULL DEFAULT 'DIRECT',
    "sourceUrl" TEXT,
    "travelledOn" DATE,
    "verifiedAt" TIMESTAMPTZ,
    "verifiedById" TEXT,
    "journeyId" TEXT,
    "serviceId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "body" JSONB,
    "heroId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ,
    "seoId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneE164" TEXT,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "travelDateFrom" DATE,
    "travelDateTo" DATE,
    "flexibleDates" BOOLEAN NOT NULL DEFAULT false,
    "adults" INTEGER,
    "children" INTEGER,
    "destinationsWanted" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "travelStyles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budgetBand" "BudgetBand" NOT NULL DEFAULT 'UNDECIDED',
    "message" TEXT,
    "sourcePath" TEXT,
    "entityType" "EntityType",
    "entityId" TEXT,
    "entityNameSnapshot" TEXT,
    "channel" "EnquiryChannel" NOT NULL DEFAULT 'FORM',
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "utm" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "consentAt" TIMESTAMPTZ,
    "contactedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryNote" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "userId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "confirmToken" TEXT,
    "source" TEXT,
    "consentAt" TIMESTAMPTZ,
    "confirmedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalNotice" (
    "id" TEXT NOT NULL,
    "scope" "NoticeScope" NOT NULL,
    "targetId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "startsOn" DATE,
    "endsOn" DATE,
    "blocksEnquiry" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SeasonalNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavigationMenu" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "NavigationMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavigationItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "kind" "NavKind" NOT NULL DEFAULT 'LINK',
    "href" TEXT,
    "entityType" "EntityType",
    "entityId" TEXT,
    "autoSource" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NavigationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "businessName" TEXT NOT NULL DEFAULT 'India Uncharted',
    "tagline" TEXT,
    "brandLine" TEXT,
    "logoId" TEXT,
    "logoLightId" TEXT,
    "faviconId" TEXT,
    "phoneE164" TEXT,
    "whatsappE164" TEXT,
    "email" TEXT,
    "enquiryEmail" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'India',
    "mapUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "socials" JSONB NOT NULL DEFAULT '[]',
    "businessHours" JSONB NOT NULL DEFAULT '[]',
    "footerDescription" TEXT,
    "copyright" TEXT,
    "defaultCtaLabel" TEXT DEFAULT 'Plan My Journey',
    "defaultCtaHref" TEXT DEFAULT '/plan-my-journey',
    "defaultOgImageId" TEXT,
    "newsletterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMPTZ NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Media_publicId_key" ON "Media"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_sha256_key" ON "Media"("sha256");

-- CreateIndex
CREATE INDEX "Media_folder_idx" ON "Media"("folder");

-- CreateIndex
CREATE INDEX "Media_licence_idx" ON "Media"("licence");

-- CreateIndex
CREATE INDEX "MediaUsage_entityType_entityId_role_sortOrder_idx" ON "MediaUsage"("entityType", "entityId", "role", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_entityType_entityId_mediaId_role_key" ON "MediaUsage"("entityType", "entityId", "mediaId", "role");

-- CreateIndex
CREATE INDEX "SeoMeta_focusKeyword_idx" ON "SeoMeta"("focusKeyword");

-- CreateIndex
CREATE INDEX "CustomMetaTag_seoId_sortOrder_idx" ON "CustomMetaTag"("seoId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_fromPath_key" ON "Redirect"("fromPath");

-- CreateIndex
CREATE UNIQUE INDEX "NotFoundLog_path_key" ON "NotFoundLog"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Category_seoId_key" ON "Category"("seoId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_type_slug_key" ON "Category"("type", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "FaqAssignment_entityType_entityId_sortOrder_idx" ON "FaqAssignment"("entityType", "entityId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FaqAssignment_faqId_entityType_entityId_key" ON "FaqAssignment"("faqId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "RelatedLink_fromType_fromId_sortOrder_idx" ON "RelatedLink"("fromType", "fromId", "sortOrder");

-- CreateIndex
CREATE INDEX "RelatedLink_toType_toId_idx" ON "RelatedLink"("toType", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "RelatedLink_fromType_fromId_toType_toId_key" ON "RelatedLink"("fromType", "fromId", "toType", "toId");

-- CreateIndex
CREATE INDEX "Section_ownerType_ownerId_sortOrder_idx" ON "Section"("ownerType", "ownerId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Region_slug_key" ON "Region"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Region_seoId_key" ON "Region"("seoId");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_seoId_key" ON "Destination"("seoId");

-- CreateIndex
CREATE INDEX "Destination_status_sortOrder_idx" ON "Destination"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "Destination_regionId_idx" ON "Destination"("regionId");

-- CreateIndex
CREATE INDEX "Destination_parentId_idx" ON "Destination"("parentId");

-- CreateIndex
CREATE INDEX "DestinationHighlight_destinationId_kind_sortOrder_idx" ON "DestinationHighlight"("destinationId", "kind", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Journey_slug_key" ON "Journey"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Journey_seoId_key" ON "Journey"("seoId");

-- CreateIndex
CREATE INDEX "Journey_status_kind_sortOrder_idx" ON "Journey"("status", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "JourneyStop_destinationId_idx" ON "JourneyStop"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyStop_journeyId_destinationId_sortOrder_key" ON "JourneyStop"("journeyId", "destinationId", "sortOrder");

-- CreateIndex
CREATE INDEX "ItineraryDay_journeyId_sortOrder_idx" ON "ItineraryDay"("journeyId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BikeTourDetail_journeyId_key" ON "BikeTourDetail"("journeyId");

-- CreateIndex
CREATE UNIQUE INDEX "Experience_slug_key" ON "Experience"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Experience_seoId_key" ON "Experience"("seoId");

-- CreateIndex
CREATE INDEX "Experience_status_sortOrder_idx" ON "Experience"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "Experience_destinationId_idx" ON "Experience"("destinationId");

-- CreateIndex
CREATE INDEX "ExperienceStep_experienceId_sortOrder_idx" ON "ExperienceStep"("experienceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Service_seoId_key" ON "Service"("seoId");

-- CreateIndex
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Article_seoId_key" ON "Article"("seoId");

-- CreateIndex
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Page_key_key" ON "Page"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Page_seoId_key" ON "Page"("seoId");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_refCode_key" ON "Enquiry"("refCode");

-- CreateIndex
CREATE INDEX "Enquiry_status_createdAt_idx" ON "Enquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_entityType_entityId_idx" ON "Enquiry"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");

-- CreateIndex
CREATE INDEX "SeasonalNotice_scope_targetId_isActive_idx" ON "SeasonalNotice"("scope", "targetId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NavigationMenu_key_key" ON "NavigationMenu"("key");

-- CreateIndex
CREATE INDEX "NavigationItem_menuId_parentId_sortOrder_idx" ON "NavigationItem"("menuId", "parentId", "sortOrder");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoMeta" ADD CONSTRAINT "SeoMeta_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoMeta" ADD CONSTRAINT "SeoMeta_twitterImageId_fkey" FOREIGN KEY ("twitterImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomMetaTag" ADD CONSTRAINT "CustomMetaTag_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMeta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaqAssignment" ADD CONSTRAINT "FaqAssignment_faqId_fkey" FOREIGN KEY ("faqId") REFERENCES "Faq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationHighlight" ADD CONSTRAINT "DestinationHighlight_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationHighlight" ADD CONSTRAINT "DestinationHighlight_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journey" ADD CONSTRAINT "Journey_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journey" ADD CONSTRAINT "Journey_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyStop" ADD CONSTRAINT "JourneyStop_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyStop" ADD CONSTRAINT "JourneyStop_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_overnightDestinationId_fkey" FOREIGN KEY ("overnightDestinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeTourDetail" ADD CONSTRAINT "BikeTourDetail_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyStyle" ADD CONSTRAINT "JourneyStyle_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyStyle" ADD CONSTRAINT "JourneyStyle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceStep" ADD CONSTRAINT "ExperienceStep_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceTheme" ADD CONSTRAINT "ExperienceTheme_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceTheme" ADD CONSTRAINT "ExperienceTheme_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyExperience" ADD CONSTRAINT "JourneyExperience_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyExperience" ADD CONSTRAINT "JourneyExperience_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceTag" ADD CONSTRAINT "ExperienceTag_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceTag" ADD CONSTRAINT "ExperienceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDestination" ADD CONSTRAINT "ArticleDestination_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDestination" ADD CONSTRAINT "ArticleDestination_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleJourney" ADD CONSTRAINT "ArticleJourney_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleJourney" ADD CONSTRAINT "ArticleJourney_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleExperience" ADD CONSTRAINT "ArticleExperience_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleExperience" ADD CONSTRAINT "ArticleExperience_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryNote" ADD CONSTRAINT "EnquiryNote_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryNote" ADD CONSTRAINT "EnquiryNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavigationItem" ADD CONSTRAINT "NavigationItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "NavigationMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavigationItem" ADD CONSTRAINT "NavigationItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NavigationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_logoLightId_fkey" FOREIGN KEY ("logoLightId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_faviconId_fkey" FOREIGN KEY ("faviconId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_defaultOgImageId_fkey" FOREIGN KEY ("defaultOgImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
