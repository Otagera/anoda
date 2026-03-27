This is a fantastic evolution of the pricing strategy. Decoupling **Compute** (the AI heavy lifting) from **Storage** (the actual image files) is a very modern, developer-friendly approach. Adding a **Bring Your Own Storage (BYOS)** option completely changes the unit economics in your favor because you offload the most unpredictable, infinitely scaling cost (blob storage) to the user.

Here is a brainstormed pricing model that factors in the split between compute and storage, introduces a BYOS tier, and localizes the pricing for the Nigerian (NGN) market (assuming a rough baseline of $1 = ₦1,500 for calculation, with slight adjustments for local purchasing power).

### 1. Understanding the Cost Split
Before defining the tiers, we must separate what you *must* host versus what the user *can* host:
* **Heavy Storage (User can host in BYOS):** Original images and optimized thumbnails. This is cheap but scales infinitely.
* **Light/Hot Storage (You MUST host):** The PostgreSQL database with `pgvector` and the 512-dimensional face embeddings. This requires high RAM and fast SSDs for rapid similarity searches.
* **Compute (You MUST host):** InsightFace processing (CPU/GPU), Sharp image optimization, DBSCAN clustering, and the API/Frontend hosting.

---

### 2. The Hybrid & BYOS Pricing Tiers (USD & NGN)

This model gives users the choice: use Anoda as a traditional SaaS (you handle everything), or use it as an AI processing engine attached to their own infrastructure (BYOS).

#### **Tier 1: Free / Hobby (Managed by You)**
For users who want to test the waters without setup.
* **Target:** Casual users, testing out the tech.
* **Price:** **Free**
* **Limits:** * Compute: 50 images processed per month.
    * Storage: 1 GB Managed Storage.
    * Features: Standard face search, "Powered by Anoda" watermark on shared links.

#### **Tier 2: Pro (Managed by You)**
For professional photographers or small families who want a plug-and-play solution.
* **Price:** **$9.99 / month** or **₦12,500 / month** *(Slightly discounted for NGN to drive local adoption)*
* **Limits:**
    * Compute: 1,500 images processed per month.
    * Storage: 50 GB Managed Storage.
    * Features: Auto-clustering, unlimited searches, unbranded sharing.
* **Overages:** ₦15 ($0.01) per extra image, ₦150 ($0.10) per extra GB.

#### **Tier 3: Power User / Creator (Bring Your Own Storage)**
This is where the user provides their AWS S3, Cloudflare R2, or Google Cloud Storage API keys. They own the images; you provide the AI and the frontend.
* **Price:** **$14.99 / month** or **₦19,500 / month**
* **Limits:**
    * Compute: 5,000 images processed per month (you are only charging for AI compute and DB embedding storage).
    * Storage: **Unlimited** (Because they pay Amazon/Cloudflare directly for the image storage).
    * Features: Priority background processing, Bring-Your-Own-Bucket (S3 compatible), custom domain for the frontend.
* **Overages:** strictly compute-based. ₦8 ($0.005) per extra image processed.

#### **Tier 4: Enterprise / Agency (BYOS + API)**
For event companies or other apps building on top of your service.
* **Price:** **$49.00 / month** or **₦65,000 / month**
* **Limits:**
    * Compute: 25,000 images processed per month.
    * Storage: BYOS only.
    * Features: Webhooks, REST API access, Daily auto-clustering.

---

### 3. How the BYOS (Bring Your Own Storage) Architecture Works Technically

If you offer a BYOS tier, you need to adjust your backend architecture slightly to ensure you aren't hit with hidden costs:

1.  **Direct-to-Cloud Uploads:** Your frontend should request a **Presigned URL** from your backend, and the user's browser should upload the image *directly* to their S3 bucket. This ensures the heavy image file never passes through your API servers, saving you massive bandwidth costs.
2.  **Worker Pulls the Image:** Your backend worker (listening to the Redis queue) temporarily downloads the image from the user's S3 bucket into RAM, runs InsightFace and Sharp, saves the optimized thumbnail back to their bucket, extracts the vector embedding, and saves the vector to *your* Postgres DB.
3.  **The Egress Catch:** If the user has an AWS bucket in `us-east-1` and your AI worker is hosted on DigitalOcean in Frankfurt, downloading their images to process them will cost someone bandwidth money. 
    * *Solution A:* Highly recommend they use **Cloudflare R2** (which has $0 bandwidth egress fees).
    * *Solution B:* Only fetch the image once, process it, and immediately discard it from your worker's memory.

### 4. Implementing the Billing Logic (Code Level)

Based on the snippet you showed earlier, you would transition your billing logic to track **Compute Credits** vs **Storage Quota**.

```typescript
// Proposed quota logic update
export const checkQuota = (resource: 'compute' | 'storage', fileSizeMB: number = 0) => async ({ userId, set }) => {
  const user = await getUserAndSubscription(userId);
  
  if (resource === 'storage') {
    // If they are on the BYOS plan, bypass storage checks completely!
    if (user.plan_type === 'BYOS') return; 
    
    if (user.storage_used_mb + fileSizeMB > user.plan_limits.max_storage_mb) {
      set.status = 403;
      throw new Error('Storage limit reached. Upgrade or switch to Bring Your Own Storage (BYOS).');
    }
  }

  if (resource === 'compute') {
    if (user.images_processed_this_month >= user.plan_limits.compute_credits) {
      set.status = 402; // Payment Required
      throw new Error('Compute credits exhausted. Purchase a top-up pack.');
    }
  }
};
```

### Why this is a winning strategy:
1. **Zero Storage Liability:** With BYOS, you don't have to worry about users uploading 500GB of 4K RAW photos and bankrupting your DigitalOcean/AWS bill.
2. **Privacy as a Feature:** You can market the NGN 19,500/mo BYOS plan as a **Privacy-First Tier**. *"You keep the photos in your bucket, we just provide the intelligence."* This is a massive selling point for professional photographers who have strict client NDAs.
3. **Frictionless Upsell:** Users can start on the Free/Pro managed tiers. When they hit the 50GB wall, you give them a choice: "Pay us $10/mo for another 50GB, OR upgrade to our BYOS tier, plug in your own Cloudflare R2 bucket, and store 1,000GB for pennies."