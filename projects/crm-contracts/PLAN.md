# Project plan

## Step 0 Project setup

Status: complete on 26 October 2026.

Create separate CRM contracts documentation, record the requested categories/products, distinguish the existing local implementation from proposed work, and define the next small step. No additional product contracts are finalized at this stage.

## Step 1 Agree the foundation

Next step: prepare a concise category/data-model and user-flow proposal for owner review.

Define category versus service model, product/module associations, category grouping/filtering, custom template creation, and how incomplete product evidence is represented. Cover existing template compatibility, especially R4 AMC versus R4 subscription. Use illustrative fields without inventing product capabilities or terms.

Review outcome: a concrete, agreed foundation and an implementation slice small enough to validate independently.

## Step 2 Implement category organisation locally

After the foundation review, implement category storage and library/picker controls. Keep existing contracts and generated agreement snapshots intact. Verify tenant access, category persistence, custom-template behaviour and responsive UI. Report the result before starting the next slice.

## Step 3 Implement product and module structure locally

Connect templates to product context and existing catalogue/module/service-line concepts. Support dOne, Xverse, Worktello, Hello Worktello and future products without hardcoded commercial commitments. Prepare editable placeholders for missing information. Verify module selections, pricing-period labels, customer population and snapshot behaviour.

Product-specific wording need not block this structural step; brochures are required to finalize the wording, not to invent temporary terms.

## Step 4 Intake source material and customize one product

John supplies brochures, product details and selected live examples. Register each source, extract scope/modules/commercial terms, record conflicts and unknowns, and prepare one product agreement for review. Suggested first candidate is dOne with modules; owner may choose another.

Do not copy another customer's identity, rates or negotiated commitments into a reusable template. Keep sales claims distinct from contractual commitments. Owner reviews substantive contract decisions.

## Step 5 Extend product coverage

Repeat the reviewed process for Xverse, Worktello, Hello Worktello, clinical AMC, integrations, development and future products. Work product by product so each has evidence, a clear status and an independent review outcome.

## Step 6 Acceptance and release

Run appropriate tests and representative customer flows. Confirm review of product wording and the exact release diff. Prepare the release and rollback notes. Push or deploy only after separate explicit production consent.

## Progress discipline

For every step record: scope, implementation, validation, pending owner decisions, and next action. Keep implemented, tested, pushed and deployed separate. Finish the current agreed slice before expanding scope. Planning here does not schedule background work or create external tasks.
