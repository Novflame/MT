import { NextResponse } from "next/server";
import {  eq } from "drizzle-orm";

import { getSchoolDB } from "@/db";

import {
  promotionDecisions,
  studentEnrollments,
  students,
  schoolClases,
  academicYears,
} from "@/db/schema";

import { calculatePromotion } from "@/lib/promotion";
import { requireSession } from "@/auth/session";

type AdminRole = "principal" | "deputy";

function isPromotionAdmin(
  role: string,
): role is AdminRole {
  return (
    role === "principal" ||
    role === "deputy"
  );
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| GET /api/promotion?academicYearId=...
|
| الحساب يتم تلقائيًا.
|
| لا يوجد زر Calculate.
|
*/

export async function GET(request: Request) {
  try {
    const session = await requireSession();

    if (
      !isPromotionAdmin(
        session.user.schoolRole,
      )
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    const db = await getSchoolDB();
    
    const url = new URL(request.url);

    const academicYearId =
      url.searchParams.get(
        "academicYearId",
      );
      
  

    if (!academicYearId) {
      return NextResponse.json(
        {
          error:
            "academicYearId is required",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Get all enrollments for this academic year
    |--------------------------------------------------------------------------
    */

    const enrollments =
      await db.query.studentEnrollments.findMany({
        where: eq(
          studentEnrollments.academicYearId,
          academicYearId,
        ),

        with: {
          student: true,
          class: true,
          academicYear: true,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | Calculate everything automatically
    |--------------------------------------------------------------------------
    */

    const results = [];

    for (const enrollment of enrollments) {
      const calculation =
        await calculatePromotion(
          db,
          enrollment.id,
        );

      const decision =
        await db.query.promotionDecisions.findFirst({
          where: (
            promotionDecision,
            { and, eq },
          ) =>
            and(
              eq(
                promotionDecision.studentId,
                enrollment.studentId,
              ),

              eq(
                promotionDecision.academicYearId,
                academicYearId,
              ),
            ),
        });

      results.push({
        student: enrollment.student,

        academicYear:
          enrollment.academicYear,

        currentClass:
          enrollment.class,

        calculation,

        decision:
          decision ?? null,
      });
    }

    return NextResponse.json({
      academicYearId,
      results,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate promotion",
      },
      {
        status: 500,
      },
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
|
| Bulk system calculation persistence.
|
| هذه العملية اختيارية للحفظ.
|
| لا تحتاج الواجهة لاستدعائها طالبًا طالبًا.
|
*/
export async function POST(request: Request) {
  try {
    const session = await requireSession();

    if (
      !isPromotionAdmin(
        session.user.schoolRole,
      )
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    const body = await request.json();

    const academicYearId =
      String(
        body.academicYearId ?? "",
      ).trim();

    const action =
      String(
        body.action ?? "calculate",
      ).trim();

    if (!academicYearId) {
      return NextResponse.json(
        {
          error:
            "academicYearId is required",
        },
        {
          status: 400,
        },
      );
    }

    if (
      action !== "calculate" &&
      action !== "close"
    ) {
      return NextResponse.json(
        {
          error:
            "action must be calculate or close",
        },
        {
          status: 400,
        },
      );
    }

    const db = await getSchoolDB();

    /*
    |--------------------------------------------------------------------------
    | Make sure the requested year exists
    |--------------------------------------------------------------------------
    */

    const academicYear =
      await db.query.academicYears.findFirst({
        where: eq(
          academicYears.id,
          academicYearId,
        ),
      });

    if (!academicYear) {
      return NextResponse.json(
        {
          error:
            "Academic year not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Promotion can only be performed on the active year
    |--------------------------------------------------------------------------
    */

    if (!academicYear.isActive) {
      return NextResponse.json(
        {
          error:
            "This academic year is already closed.",
        },
        {
          status: 409,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CALCULATE
    |--------------------------------------------------------------------------
    */

    if (action === "calculate") {
      const enrollments =
        await db.query.studentEnrollments.findMany({
          where: eq(
            studentEnrollments.academicYearId,
            academicYearId,
          ),
        });

      let processed = 0;

      for (const enrollment of enrollments) {
        const calculation =
          await calculatePromotion(
            db,
            enrollment.id,
          );

        const existing =
          await db.query.promotionDecisions.findFirst({
            where: (
              decision,
              { and, eq },
            ) =>
              and(
                eq(
                  decision.studentId,
                  enrollment.studentId,
                ),

                eq(
                  decision.academicYearId,
                  academicYearId,
                ),
              ),
          });

        /*
        |--------------------------------------------------------------------------
        | Never overwrite an administrative decision
        |--------------------------------------------------------------------------
        */

        if (
          existing &&
          existing.decidedByUserId
        ) {
          continue;
        }

        if (existing) {
          await db
            .update(promotionDecisions)
            .set({
              fromClassId:
                calculation.fromClassId,

              toClassId:
                calculation.toClassId,

              systemResult:
                calculation.systemResult,

              systemDecision:
                calculation.systemDecision,

              finalDecision:
                calculation.systemDecision,

              decidedByUserId: null,

              reason: null,
            })
            .where(
              eq(
                promotionDecisions.id,
                existing.id,
              ),
            );
        } else {
          await db
            .insert(promotionDecisions)
            .values({
              id: crypto.randomUUID(),

              studentId:
                enrollment.studentId,

              academicYearId,

              fromClassId:
                calculation.fromClassId,

              toClassId:
                calculation.toClassId,

              systemResult:
                calculation.systemResult,

              systemDecision:
                calculation.systemDecision,

              finalDecision:
                calculation.systemDecision,

              decidedByUserId: null,

              reason: null,
            });
        }

        processed++;
      }

      return NextResponse.json({
        success: true,
        action: "calculate",
        processed,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CLOSE ACADEMIC YEAR
    |--------------------------------------------------------------------------
    */

    const enrollments =
      await db.query.studentEnrollments.findMany({
        where: eq(
          studentEnrollments.academicYearId,
          academicYearId,
        ),
      });

    /*
    |--------------------------------------------------------------------------
    | Every student must have a promotion decision
    |--------------------------------------------------------------------------
    */

    for (const enrollment of enrollments) {
      const decision =
        await db.query.promotionDecisions.findFirst({
          where: (
            promotionDecision,
            { and, eq },
          ) =>
            and(
              eq(
                promotionDecision.studentId,
                enrollment.studentId,
              ),

              eq(
                promotionDecision.academicYearId,
                academicYearId,
              ),
            ),
        });

      if (!decision) {
        return NextResponse.json(
          {
            error:
              "Cannot close the academic year. Some students do not have promotion decisions.",
          },
          {
            status: 409,
          },
        );
      }

      if (!decision.finalDecision) {
        return NextResponse.json(
          {
            error:
              "Cannot close the academic year. Some promotion decisions are incomplete.",
          },
          {
            status: 409,
          },
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Promoted students must have a destination class
      |--------------------------------------------------------------------------
      */

      if (
        decision.finalDecision === "promote" &&
        !decision.toClassId
      ) {
        return NextResponse.json(
          {
            error:
              "Cannot close the academic year. A promoted student has no destination class.",
          },
          {
            status: 409,
          },
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Close the academic year
    |--------------------------------------------------------------------------
    */

    const updated =
      await db
        .update(academicYears)
        .set({
          isActive: false,
        })
        .where(
          eq(
            academicYears.id,
            academicYearId,
          ),
        )
        .returning();

    return NextResponse.json({
      success: true,
      action: "close",
      academicYear: updated[0],
      message:
        "Academic year closed successfully. You can now create a new academic year.",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process promotion",
      },
      {
        status: 500,
      },
    );
  }
}
/*
|--------------------------------------------------------------------------
| PATCH
|--------------------------------------------------------------------------
|
| Administrative exception.
|
| النظام قال شيئًا،
| المدير يستطيع تغيير القرار مع كتابة السبب.
|
*/

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();

    if (
      !isPromotionAdmin(
        session.user.schoolRole,
      )
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    const body = await request.json();

    const studentId =
      String(
        body.studentId ?? "",
      ).trim();

    const academicYearId =
      String(
        body.academicYearId ?? "",
      ).trim();

    const finalDecision =
      String(
        body.finalDecision ?? "",
      ).trim();

    const reason =
      String(
        body.reason ?? "",
      ).trim();

    const toClassId = body.toClassId
      ? String(body.toClassId).trim()
      : null;

    if (
      !studentId ||
      !academicYearId ||
      !finalDecision
    ) {
      return NextResponse.json(
        {
          error:
            "studentId, academicYearId and finalDecision are required",
        },
        {
          status: 400,
        },
      );
    }

    if (
      finalDecision !== "promote" &&
      finalDecision !== "retain"
    ) {
      return NextResponse.json(
        {
          error:
            "finalDecision must be promote or retain",
        },
        {
          status: 400,
        },
      );
    }

    if (!reason) {
      return NextResponse.json(
        {
          error:
            "A reason is required",
        },
        {
          status: 400,
        },
      );
    }

    const db = await getSchoolDB();

    const student =
      await db.query.students.findFirst({
        where: eq(
          students.id,
          studentId,
        ),
      });

    if (!student) {
      return NextResponse.json(
        {
          error: "Student not found",
        },
        {
          status: 404,
        },
      );
    }

    const enrollment =
      await db.query.studentEnrollments.findFirst({
        where: (
          enrollment,
          { and, eq },
        ) =>
          and(
            eq(
              enrollment.studentId,
              studentId,
            ),

            eq(
              enrollment.academicYearId,
              academicYearId,
            ),
          ),
      });

    if (!enrollment) {
      return NextResponse.json(
        {
          error:
            "Student enrollment not found",
        },
        {
          status: 404,
        },
      );
    }

    const existing =
      await db.query.promotionDecisions.findFirst({
        where: (
          decision,
          { and, eq },
        ) =>
          and(
            eq(
              decision.studentId,
              studentId,
            ),

            eq(
              decision.academicYearId,
              academicYearId,
            ),
          ),
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Promotion calculation does not exist yet",
        },
        {
          status: 409,
        },
      );
    }

    let finalToClassId =
      existing.toClassId;

    /*
    |--------------------------------------------------------------------------
    | Promote
    |--------------------------------------------------------------------------
    */

    if (
      finalDecision === "promote"
    ) {
      if (!toClassId) {
        return NextResponse.json(
          {
            error:
              "toClassId is required when promoting",
          },
          {
            status: 400,
          },
        );
      }

      const destinationClass =
        await db.query.schoolClases.findFirst({
          where: eq(
            schoolClases.id,
            toClassId,
          ),
        });

      if (!destinationClass) {
        return NextResponse.json(
          {
            error:
              "Destination class not found",
          },
          {
            status: 404,
          },
        );
      }

      const currentClass =
        await db.query.schoolClases.findFirst({
          where: eq(
            schoolClases.id,
            enrollment.classId,
          ),
        });

      if (!currentClass) {
        return NextResponse.json(
          {
            error:
              "Current class not found",
          },
          {
            status: 404,
          },
        );
      }

      /*
      |--------------------------------------------------------------------------
      | No capacity logic.
      |--------------------------------------------------------------------------
      */

      if (
        destinationClass.gradeLevel !==
        currentClass.gradeLevel + 1
      ) {
        return NextResponse.json(
          {
            error:
              "Destination class must belong to the next grade level",
          },
          {
            status: 400,
          },
        );
      }

      finalToClassId =
        destinationClass.id;
    } else {
      finalToClassId = null;
    }

    const [updated] =
      await db
        .update(promotionDecisions)
        .set({
          finalDecision,

          toClassId:
            finalToClassId,

          decidedByUserId:
            session.user.id,

          reason,
        })
        .where(
          eq(
            promotionDecisions.id,
            existing.id,
          ),
        )
        .returning();

    return NextResponse.json({
      success: true,
      decision: updated,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update promotion decision",
      },
      {
        status: 500,
      },
    );
  }
}