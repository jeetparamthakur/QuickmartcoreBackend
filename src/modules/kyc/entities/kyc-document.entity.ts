import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { KycDocumentType } from '../../../common/enums';
import { KycSubmissionEntity } from './kyc-submission.entity';

@Entity('kyc_documents')
@Unique(['submissionId', 'type'])
export class KycDocumentEntity extends BaseEntity {
  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId!: string;

  @Column({ type: 'enum', enum: KycDocumentType })
  type!: KycDocumentType;

  @Column({ name: 'file_url', type: 'varchar', length: 1024 })
  fileUrl!: string;

  @Column({
    name: 'cloudinary_public_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  cloudinaryPublicId?: string | null;

  @Column({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt!: Date;

  @ManyToOne(() => KycSubmissionEntity, (s) => s.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission!: KycSubmissionEntity;
}
